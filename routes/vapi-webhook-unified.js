const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../lib/db'); // Unified knex connection
const { DateTime } = require('luxon');

// Optional integrations (graceful fallback if not configured)
let twilioClient, sgMail;
try {
  const twilio = require('twilio');
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
} catch (e) {
  console.log('⚠️ Twilio not configured, SMS notifications disabled');
}

try {
  sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} catch (e) {
  console.log('⚠️ SendGrid not configured, using fallback email');
}

/**
 * HMAC signature validation for VAPI webhooks
 */
const validateWebhookSignature = (req, res, next) => {
  if (!process.env.VAPI_WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Webhook secret not configured' });
    }
    console.warn('⚠️ Webhook validation disabled - no secret configured');
    return next();
  }
  
  const signature = req.headers['x-vapi-signature'];
  const timestamp = req.headers['x-vapi-timestamp'];
  
  if (!signature || !timestamp) {
    return res.status(401).json({ error: 'Missing security headers' });
  }
  
  // Prevent replay attacks (5 minute window)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    return res.status(401).json({ error: 'Request timestamp invalid' });
  }
  
  // Verify HMAC signature
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.VAPI_WEBHOOK_SECRET)
    .update(timestamp + '.' + payload)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
};

/**
 * Idempotency middleware to prevent duplicate processing
 */
const idempotencyMiddleware = async (req, res, next) => {
  const requestId = req.headers['x-vapi-request-id'] || 
                   req.headers['x-request-id'] || 
                   crypto.randomUUID();
  
  req.requestId = requestId;
  
  try {
    // Check if already processed
    const existing = await db('processed_webhooks')
      .where('request_id', requestId)
      .first();
    
    if (existing) {
      console.log(`🔁 Duplicate request ${requestId}, returning cached response`);
      return res.status(200).json(existing.response || { 
        success: true, 
        deduplicated: true,
        message: 'Request already processed' 
      });
    }
    
    // Mark as processing
    await db('processed_webhooks').insert({
      request_id: requestId,
      event_type: req.body.type || 'function-call',
      processed_at: new Date()
    });
    
    next();
  } catch (error) {
    console.error('Idempotency check error:', error);
    next(); // Continue processing even if idempotency fails
  }
};

/**
 * Main VAPI webhook handler - unified call data storage
 */
router.post('/', validateWebhookSignature, idempotencyMiddleware, async (req, res) => {
  const startTime = Date.now();
  const payload = req.body;
  
  try {
    console.log('📞 VAPI Webhook received:', {
      type: payload.type || 'function-call',
      callId: payload.call?.id,
      functionName: payload.function || payload.functionCall?.name,
      timestamp: new Date().toISOString()
    });
    
    // Set tenant context for RLS
    const businessId = payload.business_id || 
                      payload.call?.assistantId || 
                      process.env.DEFAULT_TENANT_ID;
    await db.setTenantContext(businessId);
    
    // Handle different webhook types
    if (payload.type === 'end-of-call' && payload.call) {
      await handleEndOfCall(payload.call, payload.transcript, businessId);
      
      // Cache response for idempotency
      const response = { success: true, message: 'Call ended successfully' };
      await db('processed_webhooks')
        .where('request_id', req.requestId)
        .update({ response: JSON.stringify(response) });
      
      return res.json(response);
    }
    
    // Handle function calls (bookAppointment, etc.)
    const functionName = payload.function || payload.functionCall?.name;
    const parameters = payload.parameters || payload.functionCall?.parameters || {};
    
    let result;
    switch (functionName) {
      case 'bookAppointment':
        result = await handleBookAppointment(parameters, payload.call, businessId);
        break;
      case 'checkAvailability':
        result = await handleCheckAvailability(parameters);
        break;
      default:
        result = {
          response: "I can help you with appointments and questions. What would you like to do?"
        };
    }
    
    // Track performance
    const responseTime = Date.now() - startTime;
    console.log(`✅ Webhook processed in ${responseTime}ms`);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    // Log to monitoring (if available)
    if (global.Sentry) {
      global.Sentry.captureException(error, {
        tags: { component: 'vapi_webhook' },
        extra: { payload: req.body }
      });
    }
    
    res.status(500).json({
      response: "I'm experiencing a technical issue. Please try again in a moment.",
      error: true
    });
  }
});

/**
 * Handle appointment booking with unified storage
 */
async function handleBookAppointment(params, call, businessId) {
  const {
    customerName,
    customerPhone,
    customerEmail,
    serviceType,
    date,
    time
  } = params;
  
  // Validate required fields
  if (!customerName || !customerPhone || !date || !time) {
    return {
      response: "I need a few more details to book your appointment. Can you please provide your name, phone number, and preferred time?",
      needsMoreInfo: true
    };
  }
  
  try {
    // Parse appointment date/time
    const appointmentDateTime = DateTime.fromISO(`${date}T${time}`, 
      { zone: 'America/Los_Angeles' });
    
    if (!appointmentDateTime.isValid) {
      throw new Error(`Invalid appointment date/time: ${date} ${time}`);
    }
    
    // Store call data atomically
    const [storedCall] = await db('calls').insert({
      call_id: call?.id || crypto.randomUUID(),
      phone_number: customerPhone,
      caller_phone: customerPhone,
      caller_email: customerEmail,
      customer_name: customerName,
      appointment_date: appointmentDateTime.toJSDate(),
      business_id: businessId,
      status: 'confirmed',
      service_type: serviceType || 'General Appointment',
      ai_employee: 'luna',
      extracted_data: JSON.stringify({
        bookAppointment: params,
        callMetadata: call,
        timestamp: new Date().toISOString()
      }),
      started_at: call?.startedAt ? new Date(call.startedAt) : new Date(),
      outcome: 'booked',
      provider: 'vapi'
    }).returning('*');
    
    console.log(`📊 Call data stored successfully: ${storedCall.call_id}`);
    
    // Send notifications (async, non-blocking)
    setImmediate(() => sendBookingNotifications(storedCall, businessId));
    
    // Return immediate response to caller
    return {
      response: `Perfect ${customerName}! I've booked your ${serviceType || 'appointment'} for ${appointmentDateTime.toFormat('EEEE, MMMM d')} at ${appointmentDateTime.toFormat('h:mm a')}. You'll receive a confirmation text at ${customerPhone} shortly.`,
      success: true,
      callId: storedCall.call_id,
      appointmentDate: appointmentDateTime.toISO()
    };
    
  } catch (error) {
    console.error('Booking error:', error);
    return {
      response: "I encountered an issue while booking your appointment. Please try again or call us directly.",
      error: true
    };
  }
}

/**
 * Handle end of call processing
 */
async function handleEndOfCall(call, transcript, businessId) {
  try {
    const duration = call.endedAt && call.startedAt ? 
      Math.round((new Date(call.endedAt) - new Date(call.startedAt)) / 1000) : 0;
    
    // Update existing call record or create new one
    const existing = await db('calls').where('call_id', call.id).first();
    
    if (existing) {
      await db('calls')
        .where('call_id', call.id)
        .update({
          ended_at: new Date(call.endedAt || Date.now()),
          duration_seconds: duration,
          transcript: transcript?.text || '',
          messages: JSON.stringify(transcript?.messages || []),
          cost: call.cost || 0,
          recording_url: call.recordingUrl,
          outcome: determineCallOutcome(transcript),
          updated_at: new Date()
        });
    } else {
      // Create call record if not exists
      await db('calls').insert({
        call_id: call.id,
        phone_number: call.phoneNumber || 'unknown',
        business_id: businessId,
        started_at: new Date(call.startedAt || Date.now()),
        ended_at: new Date(call.endedAt || Date.now()),
        duration_seconds: duration,
        transcript: transcript?.text || '',
        messages: JSON.stringify(transcript?.messages || []),
        ai_employee: 'luna',
        provider: 'vapi',
        cost: call.cost || 0,
        recording_url: call.recordingUrl,
        outcome: determineCallOutcome(transcript)
      });
    }
    
    console.log(`📞 Call ${call.id} ended. Duration: ${duration}s`);
    
  } catch (error) {
    console.error('Failed to handle call end:', error);
    throw error;
  }
}

/**
 * Send booking notifications (SMS + Email)
 */
async function sendBookingNotifications(callData, businessId) {
  try {
    // Get business owner contact info
    const business = await db('businesses')
      .where('id', businessId)
      .first();
    
    if (!business) {
      console.error('Business not found for notifications');
      return;
    }
    
    const appointmentDate = DateTime.fromJSDate(callData.appointment_date, 
      { zone: 'America/Los_Angeles' });
    
    // SMS to customer
    if (twilioClient && callData.caller_phone) {
      try {
        await twilioClient.messages.create({
          body: `Hi ${callData.customer_name}! Your ${callData.service_type} appointment is confirmed for ${appointmentDate.toFormat('EEE, MMM d')} at ${appointmentDate.toFormat('h:mm a')}. Confirmation: ${callData.call_id}. See you then! ✨`,
          from: process.env.TWILIO_FROM_NUMBER,
          to: callData.caller_phone
        });
        console.log(`📱 SMS sent to customer: ${callData.caller_phone}`);
      } catch (error) {
        console.error('SMS to customer failed:', error);
      }
    }
    
    // SMS to business owner  
    if (twilioClient && business.owner_phone) {
      try {
        await twilioClient.messages.create({
          body: `🚨 NEW BOOKING!\n${callData.customer_name}\n📱 ${callData.caller_phone}\n📅 ${appointmentDate.toFormat('EEE, MMM d')} at ${appointmentDate.toFormat('h:mm a')}\n💼 ${callData.service_type}`,
          from: process.env.TWILIO_FROM_NUMBER,
          to: business.owner_phone
        });
        console.log(`📱 SMS sent to owner: ${business.owner_phone}`);
      } catch (error) {
        console.error('SMS to owner failed:', error);
      }
    }
    
    // Email to customer
    if (sgMail && callData.caller_email) {
      try {
        await sgMail.send({
          to: callData.caller_email,
          from: process.env.FROM_EMAIL || 'no-reply@chattyai.com',
          subject: `Appointment Confirmed - ${callData.service_type}`,
          html: generateCustomerEmailHTML(callData, appointmentDate),
          text: `Hi ${callData.customer_name}! Your ${callData.service_type} appointment is confirmed for ${appointmentDate.toFormat('EEE, MMM d')} at ${appointmentDate.toFormat('h:mm a')}. Confirmation: ${callData.call_id}`
        });
        console.log(`📧 Email sent to customer: ${callData.caller_email}`);
      } catch (error) {
        console.error('Email to customer failed:', error);
      }
    }
    
    // Email to business owner
    if (sgMail && business.owner_email) {
      try {
        await sgMail.send({
          to: business.owner_email,
          from: process.env.FROM_EMAIL || 'no-reply@chattyai.com',
          subject: `New Booking: ${callData.customer_name} - ${appointmentDate.toFormat('MMM d')}`,
          html: generateOwnerEmailHTML(callData, appointmentDate),
          text: `New appointment booked: ${callData.customer_name} (${callData.caller_phone}) for ${appointmentDate.toFormat('EEE, MMM d')} at ${appointmentDate.toFormat('h:mm a')}`
        });
        console.log(`📧 Email sent to owner: ${business.owner_email}`);
      } catch (error) {
        console.error('Email to owner failed:', error);
      }
    }
    
  } catch (error) {
    console.error('❌ Notification sending failed:', error);
    // Don't throw - notifications are non-critical
  }
}

/**
 * Generate HTML email for customer
 */
function generateCustomerEmailHTML(callData, appointmentDate) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">✨ Your Appointment is Confirmed!</h2>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
        <p>Hi ${callData.customer_name}!</p>
        <p>Your <strong>${callData.service_type}</strong> appointment is confirmed for:</p>
        <p style="font-size: 18px; color: #2563eb;"><strong>${appointmentDate.toFormat('EEEE, MMMM d')} at ${appointmentDate.toFormat('h:mm a')}</strong></p>
        <p><strong>Confirmation ID:</strong> ${callData.call_id}</p>
      </div>
      <p style="text-align: center; margin-top: 20px;">
        <img src="https://luna-visual-server.onrender.com/luna.gif" alt="Luna AI" style="width: 100px; height: 100px;"/>
      </p>
      <p style="text-align: center; color: #666;">
        Booked by Luna AI • TheChattyAI System
      </p>
    </div>
  `;
}

/**
 * Generate HTML email for business owner
 */
function generateOwnerEmailHTML(callData, appointmentDate) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">🚨 New Booking Alert!</h2>
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
        <h3>Appointment Details</h3>
        <p><strong>Customer:</strong> ${callData.customer_name}</p>
        <p><strong>Phone:</strong> ${callData.caller_phone}</p>
        <p><strong>Email:</strong> ${callData.caller_email || 'Not provided'}</p>
        <p><strong>Service:</strong> ${callData.service_type}</p>
        <p><strong>Date/Time:</strong> ${appointmentDate.toFormat('EEEE, MMMM d')} at ${appointmentDate.toFormat('h:mm a')}</p>
        <p><strong>Confirmation:</strong> ${callData.call_id}</p>
      </div>
      <p style="text-align: center; color: #666; margin-top: 20px;">
        Booked by Luna AI • TheChattyAI System
      </p>
    </div>
  `;
}

/**
 * Handle availability check
 */
async function handleCheckAvailability(params) {
  // Mock availability for now - replace with real calendar integration
  const slots = [
    { time: '10:00 AM', date: 'tomorrow' },
    { time: '2:00 PM', date: 'tomorrow' },
    { time: '4:00 PM', date: 'tomorrow' }
  ];
  
  return {
    response: "I have availability tomorrow at 10 AM, 2 PM, and 4 PM. Which time works best for you?",
    slots
  };
}

/**
 * Determine call outcome from transcript
 */
function determineCallOutcome(transcript) {
  if (!transcript?.text) return 'completed';
  
  const text = transcript.text.toLowerCase();
  
  if (text.includes('booked') || text.includes('appointment confirmed')) {
    return 'booked';
  } else if (text.includes('complaint') || text.includes('unhappy')) {
    return 'complaint';
  } else if (text.includes('just checking') || text.includes('information')) {
    return 'info_provided';
  } else if (text.includes('wrong number') || text.includes('not interested')) {
    return 'not_interested';
  }
  
  return 'completed';
}

module.exports = router; 