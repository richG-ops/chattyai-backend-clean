const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../db-config');
const { v4: uuidv4 } = require('uuid');
const { DateTime } = require('luxon');
const { addBookingJob, addAnalyticsJob, addNotificationJob, PRIORITIES } = require('../lib/job-queue');

// HMAC signature validation
const validateWebhookSignature = (req, res, next) => {
  // Skip validation if no secret configured (dev only)
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
  
  // Check timestamp (prevent replay outside 5-minute window)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    return res.status(401).json({ error: 'Request timestamp invalid' });
  }
  
  // Validate HMAC signature
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

// Elite idempotency implementation
const idempotencyMiddleware = async (req, res, next) => {
  const requestId = req.headers['x-vapi-request-id'] || 
                   req.headers['x-request-id'] || 
                   crypto.randomUUID();
  
  req.requestId = requestId;
  const db = req.db || getDb();
  
  try {
    // Try to insert - will fail if already exists
    await db('processed_webhooks').insert({
      request_id: requestId,
      event_type: req.body.type || 'unknown'
    });
    
    // New request - continue processing
    next();
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      // Already processed - return cached response
      const existing = await db('processed_webhooks')
        .where('request_id', requestId)
        .first();
      
      if (existing?.response) {
        console.log(`🔁 Returning cached response for ${requestId}`);
        return res.status(200).json(existing.response);
      }
      
      // No cached response - return success
      return res.status(200).json({ 
        success: true, 
        deduplicated: true,
        message: 'Request already processed' 
      });
    }
    
    // Other error - continue but log
    console.error('Idempotency check error:', error);
    next();
  }
};

// Helper: Extract structured Q&A pairs from transcript
const extractQAPairs = (messages, callId, tenantId) => {
  if (!messages || !Array.isArray(messages)) return [];
  
  const pairs = [];
  let sequenceNumber = 0;
  
  for (let i = 0; i < messages.length - 1; i++) {
    const current = messages[i];
    const next = messages[i + 1];
    
    // Look for assistant question followed by user answer
    if (current.role === 'assistant' && next.role === 'user') {
      const question = current.text || current.content;
      const answer = next.text || next.content;
      
      // Determine intent from question/answer content
      const intent = determineIntent(question, answer);
      
      // Extract metadata (dates, phone numbers, etc.)
      const metadata = extractMetadata(question, answer);
      
      pairs.push({
        call_id: callId,
        tenant_id: tenantId,
        question,
        answer,
        sequence_number: sequenceNumber++,
        intent,
        metadata: JSON.stringify(metadata),
        created_at: new Date()
      });
    }
  }
  
  return pairs;
};

// Helper: Determine intent from Q&A content
const determineIntent = (question, answer) => {
  const q = (question || '').toLowerCase();
  const a = (answer || '').toLowerCase();
  
  if (q.includes('appointment') || q.includes('book') || a.includes('appointment')) {
    return 'booking';
  } else if (q.includes('complaint') || q.includes('problem') || a.includes('unhappy')) {
    return 'complaint';
  } else if (q.includes('price') || q.includes('cost') || q.includes('how much')) {
    return 'pricing';
  } else if (q.includes('hours') || q.includes('open') || q.includes('when')) {
    return 'hours';
  } else if (q.includes('name') || q.includes('phone') || q.includes('email')) {
    return 'contact_info';
  }
  
  return 'general';
};

// Helper: Extract structured metadata from answers
const extractMetadata = (question, answer) => {
  const metadata = {};
  
  // Extract phone numbers
  const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
  const phones = answer.match(phoneRegex);
  if (phones) metadata.phone = phones[0];
  
  // Extract email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = answer.match(emailRegex);
  if (emails) metadata.email = emails[0];
  
  // Extract dates
  const dateRegex = /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi;
  const dates = answer.match(dateRegex);
  if (dates) metadata.date = dates[0];
  
  // Extract times
  const timeRegex = /\b\d{1,2}:\d{2}\s*(?:am|pm)|\b\d{1,2}\s*(?:am|pm)\b/gi;
  const times = answer.match(timeRegex);
  if (times) metadata.time = times[0];
  
  // Extract names (basic heuristic)
  if (question.toLowerCase().includes('name')) {
    const words = answer.split(' ').filter(w => w.length > 1);
    if (words.length <= 3) {
      metadata.name = answer.trim();
    }
  }
  
  return metadata;
};

// Enhanced Vapi webhook handler with full data persistence
router.post('/', validateWebhookSignature, idempotencyMiddleware, async (req, res) => {
  const startTime = Date.now();
  const db = req.db || getDb();
  const tenantId = req.tenantId || req.body.tenantId || process.env.DEFAULT_TENANT_ID;
  
  try {
    const { 
      type,           // function-call, end-of-call, etc.
      call,           // Call metadata
      functionCall,   // For function calls
      transcript,     // For end-of-call
      function: functionName,
      parameters,
      aiEmployee = 'luna'
    } = req.body;
    
    console.log('📞 VAPI Webhook received:', {
      type: type || 'function-call',
      functionName: functionName || functionCall?.name,
      callId: call?.id,
      tenantId,
      timestamp: new Date().toISOString()
    });
    
    // Handle different webhook types
    if (type === 'end-of-call' && call) {
      // Store call record with transcript and extract Q&A
      await handleEndOfCall(call, transcript, tenantId, db);
      
      // Cache response for idempotency
      const response = { success: true, message: 'Call ended successfully' };
      await db('processed_webhooks')
        .where('request_id', req.requestId)
        .update({ response: JSON.stringify(response) });
      
      return res.json(response);
    }
    
    // Handle function calls
    const funcName = functionName || functionCall?.name;
    const params = parameters || functionCall?.parameters || {};
    
    // Store incoming call if not exists
    if (call?.id) {
      await storeCallRecord(call, funcName, params);
    }
    
    let result;
    switch (funcName) {
      case 'checkAvailability':
        result = await handleCheckAvailability(params, aiEmployee);
        break;
        
      case 'bookAppointment':
        result = await handleBookAppointment(params, aiEmployee, call);
        break;
        
      case 'getBusinessHours':
        result = await handleGetBusinessHours(aiEmployee);
        break;
        
      case 'handleComplaint':
        result = await handleComplaint(params, aiEmployee, call);
        break;
        
      case 'qualifyLead':
        result = await handleLeadQualification(params, aiEmployee, call);
        break;
        
      default:
        result = {
          response: `I can help you with appointments, business hours, or answer questions. What would you like to do?`
        };
    }
    
    // Track response time
    const responseTime = Date.now() - startTime;
    console.log(`✅ Webhook processed in ${responseTime}ms`);
    
    // Return result to Vapi
    res.json(result);
    
    // Analytics (async, don't wait)
    addAnalyticsJob('webhook_processed', {
      functionName: funcName,
      responseTime,
      callId: call?.id,
      success: true
    }).catch(console.error);
    
  } catch (error) {
    console.error('❌ Vapi webhook error:', error);
    
    // Log error to Sentry
    if (global.Sentry) {
      global.Sentry.captureException(error, {
        tags: { webhook: 'vapi' },
        extra: req.body
      });
    }
    
    // Return graceful error to Vapi
    res.json({
      response: "I'm experiencing a technical issue. Please try again in a moment.",
      error: true
    });
  }
});

// Store or update call record
async function storeCallRecord(call, functionName, parameters) {
  const db = getDb();
  
  try {
    // Check if call exists
    const existing = await db('calls').where('call_id', call.id).first();
    
    if (!existing) {
      // Create new call record
      await db('calls').insert({
        call_id: call.id,
        tenant_id: call.assistantId, // Map to tenant
        phone_number: call.phoneNumber || call.from || 'unknown',
        started_at: new Date(call.startedAt || Date.now()),
        direction: call.direction || 'inbound',
        assistant_id: call.assistantId,
        ai_employee: call.aiEmployee || 'luna',
        provider: 'vapi',
        provider_metadata: call
      });
    }
    
    // Update with latest function call
    if (functionName) {
      await db('calls')
        .where('call_id', call.id)
        .update({
          extracted_data: db.raw(`
            COALESCE(extracted_data, '{}'::jsonb) || ?::jsonb
          `, [JSON.stringify({ [functionName]: parameters })]),
          updated_at: new Date()
        });
    }
  } catch (error) {
    console.error('Failed to store call record:', error);
  }
}

// Handle end of call with Q&A extraction
async function handleEndOfCall(call, transcript, tenantId, db) {
  try {
    const duration = call.endedAt && call.startedAt ? 
      Math.round((new Date(call.endedAt) - new Date(call.startedAt)) / 1000) : 0;
    
    // Update call record
    await db('calls')
      .where('call_id', call.id)
      .update({
        ended_at: new Date(call.endedAt || Date.now()),
        duration_seconds: duration,
        transcript: transcript?.text || '',
        messages: transcript?.messages || [],
        cost: call.cost || 0,
        recording_url: call.recordingUrl,
        outcome: determineCallOutcome(transcript),
        updated_at: new Date()
      });
    
    // Extract and store Q&A pairs
    if (transcript?.messages) {
      const qaPairs = extractQAPairs(transcript.messages, call.id, tenantId);
      
      if (qaPairs.length > 0) {
        await db.batchInsert('call_qa_pairs', qaPairs, 100);
        console.log(`📝 Extracted ${qaPairs.length} Q&A pairs from call ${call.id}`);
        
        // Check if this was a booking intent
        const bookingQA = qaPairs.find(qa => qa.intent === 'booking');
        if (bookingQA) {
          // Extract booking details from Q&A metadata
          const metadata = JSON.parse(bookingQA.metadata || '{}');
          if (metadata.name && metadata.phone) {
            await addBookingJob({
              callId: call.id,
              tenantId,
              customerName: metadata.name,
              customerPhone: metadata.phone,
              customerEmail: metadata.email,
              date: metadata.date,
              time: metadata.time,
              source: 'vapi_qa_extraction'
            }, { priority: PRIORITIES.HIGH });
          }
        }
        
        // Check for complaint intent
        const complaintQA = qaPairs.find(qa => qa.intent === 'complaint');
        if (complaintQA) {
          await addNotificationJob('sms', {
            to: process.env.OWNER_PHONE || '7027760084',
            template: 'urgent_complaint',
            data: {
              callId: call.id,
              phone: call.phoneNumber,
              complaint: complaintQA.answer
            }
          }, { priority: PRIORITIES.CRITICAL });
        }
      }
    }
    
    console.log(`📞 Call ${call.id} ended. Duration: ${duration}s`);
  } catch (error) {
    console.error('Failed to handle call end:', error);
    throw error;
  }
}

// Determine call outcome from transcript
function determineCallOutcome(transcript) {
  if (!transcript?.text) return 'unknown';
  
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

// Handle appointment booking with full data persistence
async function handleBookAppointment(params, aiEmployee, call) {
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
    // Queue booking job for async processing
    const job = await addBookingJob({
      customerName,
      customerPhone,
      customerEmail,
      serviceType: serviceType || 'General Appointment',
      date,
      time,
      aiEmployee,
      callId: call?.id,
      source: 'vapi',
      ownerPhone: process.env.OWNER_PHONE || '7027760084',
      ownerEmail: process.env.OWNER_EMAIL || 'richard.gallagherxyz@gmail.com',
      timezone: 'America/Los_Angeles',
      metadata: {
        vapiCallId: call?.id,
        aiEmployee
      }
    }, {
      priority: PRIORITIES.HIGH
    });
    
    console.log(`📅 Booking job queued: ${job.id}`);
    
    // Return immediate response to caller
    const appointmentDate = DateTime.fromISO(`${date}T${time}`, 
      { zone: 'America/Los_Angeles' });
    
    return {
      response: `Perfect ${customerName}! I've booked your ${serviceType || 'appointment'} for ${appointmentDate.toFormat('EEEE, MMMM d')} at ${appointmentDate.toFormat('h:mm a')}. You'll receive a confirmation text at ${customerPhone} shortly.`,
      success: true,
      bookingQueued: true,
      jobId: job.id
    };
    
  } catch (error) {
    console.error('Booking error:', error);
    return {
      response: "I encountered an issue while booking your appointment. Please try again or call us directly.",
      error: true
    };
  }
}

// Handle lead qualification
async function handleLeadQualification(params, aiEmployee, call) {
  const db = getDb();
  
  try {
    const leadData = {
      lead_id: uuidv4(),
      name: params.name,
      phone: params.phone,
      email: params.email,
      company: params.company,
      industry: params.industry,
      source: 'vapi_call',
      call_id: call?.id,
      status: 'new',
      qualification_data: params,
      budget_range: params.budget,
      timeline: params.timeline,
      needs: params.needs,
      interest_level: determineInterestLevel(params),
      interested_services: params.services || [],
      metadata: {
        aiEmployee,
        callId: call?.id
      }
    };
    
    // Insert lead
    const [lead] = await db('leads').insert(leadData).returning('*');
    
    // Queue follow-up based on interest level
    if (lead.interest_level === 'hot') {
      await addFollowupJob({
        type: 'hot_lead_followup',
        leadId: lead.id
      }, 30 * 60 * 1000); // 30 minutes
    }
    
    console.log(`🎯 Lead qualified: ${lead.lead_id}`);
    
    return {
      response: generateLeadResponse(lead.interest_level, params),
      leadQualified: true,
      interestLevel: lead.interest_level
    };
    
  } catch (error) {
    console.error('Lead qualification error:', error);
    return {
      response: "Thank you for your interest! Someone from our team will reach out to you soon.",
      error: true
    };
  }
}

// Determine interest level from qualification data
function determineInterestLevel(params) {
  const score = 
    (params.timeline === 'immediate' ? 30 : 10) +
    (params.budget && params.budget !== 'not_sure' ? 20 : 0) +
    (params.decisionMaker === 'yes' ? 20 : 5) +
    (params.currentSolution === 'none' ? 15 : 5) +
    (params.painPoints && params.painPoints.length > 2 ? 15 : 5);
  
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

// Generate personalized lead response
function generateLeadResponse(interestLevel, params) {
  switch (interestLevel) {
    case 'hot':
      return `This sounds like a perfect fit! Based on what you've told me, our solution can definitely help with ${params.painPoints?.[0] || 'your needs'}. Someone from our team will call you within the next 30 minutes to discuss next steps.`;
    case 'warm':
      return `Thank you for sharing that information! It sounds like we might be able to help. One of our specialists will reach out within the next business day to learn more about your needs.`;
    default:
      return `Thank you for your interest! I've captured your information and someone from our team will be in touch when you're ready to move forward.`;
  }
}

// Handle complaints with tracking
async function handleComplaint(params, aiEmployee, call) {
  const db = getDb();
  
  try {
    // Update call record
    if (call?.id) {
      await db('calls')
        .where('call_id', call.id)
        .update({
          contains_complaint: true,
          escalation_needed: true,
          escalation_reason: params.complaint || 'Customer complaint'
        });
    }
    
    // Queue urgent notification
    await addNotificationJob({
      to: process.env.OWNER_PHONE || '7027760084',
      template: 'urgent_complaint',
      data: {
        customerPhone: call?.phoneNumber || 'Unknown',
        complaint: params.complaint || 'No details provided',
        callId: call?.id
      }
    }, {
      priority: PRIORITIES.CRITICAL
    });
    
    return {
      response: "I sincerely apologize for any inconvenience. I'm escalating this to our management team immediately. Someone will call you back within the next 30 minutes to resolve this issue. Is the best number to reach you at " + (call?.phoneNumber || "the number you're calling from") + "?",
      escalated: true
    };
    
  } catch (error) {
    console.error('Complaint handling error:', error);
    return {
      response: "I apologize for the trouble you're experiencing. Please hold while I connect you with a manager.",
      error: true
    };
  }
}

// Get business hours (example implementation)
async function handleGetBusinessHours(aiEmployee) {
  // This could be pulled from database based on tenant
  return {
    response: "We're open Monday through Friday from 9 AM to 6 PM, and Saturday from 10 AM to 4 PM. We're closed on Sundays. Would you like to schedule an appointment?",
    data: {
      monday: { open: "9:00 AM", close: "6:00 PM" },
      tuesday: { open: "9:00 AM", close: "6:00 PM" },
      wednesday: { open: "9:00 AM", close: "6:00 PM" },
      thursday: { open: "9:00 AM", close: "6:00 PM" },
      friday: { open: "9:00 AM", close: "6:00 PM" },
      saturday: { open: "10:00 AM", close: "4:00 PM" },
      sunday: { closed: true }
    }
  };
}

// Check availability (example - should integrate with real calendar)
async function handleCheckAvailability(params, aiEmployee) {
  const { date, timePreference } = params;
  
  // This is a simplified example - in production, query actual calendar
  const slots = [
    { time: "10:00 AM", available: true },
    { time: "2:00 PM", available: true },
    { time: "4:00 PM", available: true }
  ];
  
  return {
    response: `I have availability ${date || 'tomorrow'} at 10 AM, 2 PM, and 4 PM. Which time works best for you?`,
    slots,
    date: date || 'tomorrow'
  };
}

module.exports = router; 