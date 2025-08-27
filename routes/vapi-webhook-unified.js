// routes/vapi-webhook-unified.js - Unified VAPI Webhook Handler
const express = require('express');
const router = express.Router();
const db = require('../db-config');
const crypto = require('crypto');
const { newId } = require('../lib/id');

// Twilio SMS setup
const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Email adapter (optional)
const { sendEmail, emailEnabled } = require('../lib/email');

// HMAC signature verification middleware
function verifyVapiSignature(req, res, next) {
  if (!process.env.VAPI_WEBHOOK_SECRET) {
    console.warn('⚠️ VAPI_WEBHOOK_SECRET not set - skipping signature verification');
    return next();
  }

  const signature = req.headers['x-vapi-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.VAPI_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

// Main webhook handler - processes VAPI calls and stores data
router.post('/', verifyVapiSignature, async (req, res) => {
  const startTime = Date.now();
  const webhookId = newId().slice(0, 8);
  
  console.log(`🔌 [${webhookId}] VAPI webhook received:`, {
    type: req.body.type,
    callId: req.body.call?.id,
    timestamp: new Date().toISOString()
  });

  try {
    const { type, call } = req.body;
    
    // Only process call completion events
    if (type !== 'end-of-call-report') {
      console.log(`📋 [${webhookId}] Ignoring event type: ${type}`);
      return res.json({ success: true, message: 'Event acknowledged' });
    }

    if (!call || !call.id) {
      throw new Error('Missing call data in webhook payload');
    }

    // Extract call data from VAPI payload
    const {
      id: call_id,
      phoneNumber: phone_number,
      startedAt,
      endedAt,
      transcript,
      recordingUrl,
      cost = 0
    } = call;

    // Extract structured data from function calls
    let extracted_data = {};
    let caller_phone = phone_number;
    let caller_email = null;
    let appointment_date = null;
    let customer_name = null;
    let service_type = null;
    let outcome = 'completed';

    // Parse function calls for booking data
    if (call.messages && Array.isArray(call.messages)) {
      for (const message of call.messages) {
        if (message.type === 'function_call' && message.function?.name === 'bookAppointment') {
          const params = message.function.parameters || {};
          extracted_data.bookAppointment = params;
          
          caller_phone = params.customerPhone || phone_number;
          caller_email = params.customerEmail;
          customer_name = params.customerName;
          service_type = params.serviceType;
          appointment_date = params.date;
          outcome = 'booked';
          
          console.log(`📅 [${webhookId}] Booking extracted:`, {
            customer: customer_name,
            service: service_type,
            date: appointment_date
          });
          break;
        }
      }
    }

    // Validate required data for booking
    if (outcome === 'booked' && (!caller_email || !appointment_date)) {
      console.warn(`⚠️ [${webhookId}] Incomplete booking data - storing as info call`);
      outcome = 'info_provided';
    }

    const tenant_id = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000000';

    // Store call data in unified calls table
    const callData = {
      call_id,
      tenant_id,
      phone_number: caller_phone,
      started_at: new Date(startedAt),
      ended_at: new Date(endedAt),
      duration_seconds: Math.round((new Date(endedAt) - new Date(startedAt)) / 1000),
      outcome,
      extracted_data: JSON.stringify(extracted_data),
      transcript: transcript || '',
      caller_phone,
      caller_email,
      appointment_date: appointment_date ? new Date(appointment_date) : null,
      status: outcome === 'booked' ? 'confirmed' : 'completed',
      created_at: new Date(),
      updated_at: new Date()
    };

    console.log(`💾 [${webhookId}] Storing call data:`, {
      call_id,
      outcome,
      customer: customer_name,
      duration: callData.duration_seconds
    });

    const [storedCall] = await db('calls')
      .insert(callData)
      .returning('*')
      .onConflict('call_id')
      .merge(['updated_at', 'transcript', 'extracted_data', 'outcome']);

    // Send notifications for bookings
    if (outcome === 'booked' && caller_email && appointment_date) {
      console.log(`📨 [${webhookId}] Sending notifications for booking...`);
      
      // Get business owner contact info
      const owner_phone = process.env.DEFAULT_OWNER_PHONE || '+17027760084';
      const owner_email = process.env.DEFAULT_OWNER_EMAIL || 'richard.gallagherxyz@gmail.com';

      // Format appointment date nicely
      const appointmentFormatted = new Date(appointment_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Send SMS notifications
      try {
        // Customer SMS
        const customerSMS = `Hi ${customer_name || 'there'}! Your ${service_type || 'appointment'} is confirmed for ${appointmentFormatted}. We'll send you a reminder 24 hours before. Reply STOP to opt out.`;
        
        await twilio.messages.create({
          body: customerSMS,
          from: process.env.TWILIO_FROM_NUMBER,
          to: caller_phone
        });

        // Business owner SMS
        const ownerSMS = `🔔 NEW BOOKING ALERT! 
Customer: ${customer_name || 'Unknown'}
Phone: ${caller_phone}
Service: ${service_type || 'Not specified'}
Date: ${appointmentFormatted}
View details: ${process.env.DASHBOARD_URL || 'Dashboard'}`;

        await twilio.messages.create({
          body: ownerSMS,
          from: process.env.TWILIO_FROM_NUMBER,
          to: owner_phone
        });

        console.log(`📱 [${webhookId}] SMS notifications sent successfully`);
      } catch (smsError) {
        console.error(`❌ [${webhookId}] SMS failed:`, smsError.message);
      }

      // Send email notifications
      try {
        const emailPromises = [];

        // Customer confirmation email
        emailPromises.push(sendEmail({
          to: caller_email,
          from: process.env.FROM_EMAIL || 'no-reply@chattyai.com',
          subject: `Appointment Confirmed - ${service_type || 'Service'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Appointment Confirmed! 🎉</h2>
              <p>Hi ${customer_name || 'there'},</p>
              <p>Your <strong>${service_type || 'appointment'}</strong> has been successfully scheduled.</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #495057;">Appointment Details</h3>
                <p><strong>Date:</strong> ${appointmentFormatted}</p>
                <p><strong>Service:</strong> ${service_type || 'As discussed'}</p>
                <p><strong>Contact:</strong> ${owner_phone}</p>
              </div>
              
              <p>We'll send you a reminder 24 hours before your appointment.</p>
              <p>If you need to reschedule, please call us at ${owner_phone}.</p>
              
              <hr style="margin: 30px 0; border: 1px solid #eee;">
              <p style="color: #666; font-size: 14px;">Powered by Luna AI Assistant</p>
            </div>
          `
        }));

        // Business owner notification email
        emailPromises.push(sendEmail({
          to: owner_email,
          from: process.env.FROM_EMAIL || 'no-reply@chattyai.com',
          subject: `🔔 New Booking: ${customer_name || 'Customer'} - ${service_type || 'Service'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #28a745;">New Booking Received! 🎉</h2>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #495057;">Customer Details</h3>
                <p><strong>Name:</strong> ${customer_name || 'Not provided'}</p>
                <p><strong>Phone:</strong> ${caller_phone}</p>
                <p><strong>Email:</strong> ${caller_email}</p>
                <p><strong>Service:</strong> ${service_type || 'Not specified'}</p>
                <p><strong>Appointment Date:</strong> ${appointmentFormatted}</p>
                <p><strong>Call Duration:</strong> ${callData.duration_seconds}s</p>
              </div>
              
              <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0;">Quick Actions</h4>
                <p style="margin: 5px 0;">📱 Call customer: <a href="tel:${caller_phone}">${caller_phone}</a></p>
                <p style="margin: 5px 0;">📧 Email customer: <a href="mailto:${caller_email}">${caller_email}</a></p>
              </div>
              
              <hr style="margin: 30px 0; border: 1px solid #eee;">
              <p style="color: #666; font-size: 14px;">Automatically captured by Luna AI Assistant</p>
            </div>
          `
        }));

        await Promise.all(emailPromises);
        console.log(`📧 [${webhookId}] Email notifications sent successfully`);
        
      } catch (emailError) {
        console.error(`❌ [${webhookId}] Email failed:`, emailError.message);
      }
    }

    const processingTime = Date.now() - startTime;
    
    console.log(`✅ [${webhookId}] Webhook processed successfully in ${processingTime}ms:`, {
      call_id,
      outcome,
      notifications_sent: outcome === 'booked',
      stored_id: storedCall.call_id
    });

    res.json({ 
      success: true, 
      webhook_id: webhookId,
      call_id: storedCall.call_id,
      outcome,
      processing_time_ms: processingTime,
      notifications_sent: outcome === 'booked' && caller_email && appointment_date
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error(`❌ [${webhookId}] Webhook error (${processingTime}ms):`, {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    res.status(500).json({ 
      error: 'Webhook processing failed', 
      webhook_id: webhookId,
      message: error.message,
      processing_time_ms: processingTime
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'vapi-webhook-unified',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router; 