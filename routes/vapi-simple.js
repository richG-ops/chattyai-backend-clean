const express = require('express');
const router = express.Router();

const { getAvailability, bookAppointment } = require('../lib/calendarClient');
const { DateTime } = require('luxon');
const { human, addMinutes } = require('../lib/time');
const { setUpstreamStatus } = require('../lib/logging');
const { enqueueNow, enqueueAt } = (() => { try { return require('../lib/queues/notifications'); } catch (_) { return {}; } })();

const TENANT_TZ = process.env.TENANT_TZ || 'America/Los_Angeles';
  
// Add Twilio for SMS functionality
const twilio = require('twilio');
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID',
  process.env.TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN'
);
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || '+1XXXXXXXXXX';

// Send SMS function
async function sendSMS(to, message) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'YOUR_TWILIO_ACCOUNT_SID') {
      console.log('📱 SMS SIMULATION (Twilio not configured):');
      console.log(`TO: ${to}`);
      console.log(`MESSAGE: ${message}`);
      console.log('---');
      return { success: true, simulated: true };
    }
    
    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_FROM_NUMBER,
      to: to
    });
    console.log('✅ SMS sent:', result.sid);
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('❌ SMS error:', error);
    return { success: false, error: error.message };
  }
}

// Simple VAPI endpoint for voice AI integration
// No authentication required for basic functionality
router.post('/', async (req, res) => {
  const requestId = req.headers['x-vapi-request-id'] || `vapi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { function: functionName, parameters } = req.body;
    
    console.log('🎙️ VAPI Simple called:', { 
      functionName, 
      parameters,
      requestId,
      timestamp: new Date().toISOString()
    });
    
    let response;
    
    switch (functionName) {
      case 'checkAvailability': {
        const fromISO = (parameters && parameters.fromISO) || DateTime.utc().toISO();
        const toISO = (parameters && parameters.toISO) || DateTime.utc().plus({ days: 7 }).toISO();

        let slots = [];
        try {
          const avail = await getAvailability({ from: fromISO, to: toISO });
          const raw = Array.isArray(avail) ? avail : (avail.slots || []);
          slots = raw.slice(0, 6).map((s) => {
            const startISO = s.startISO || s.start || s.startTime;
            const endISO   = s.endISO   || s.end   || s.endTime;
            return {
              startISO, endISO,
              startLocal: human(startISO, TENANT_TZ),
              endLocal: human(endISO, TENANT_TZ),
            };
          });
        } catch (err) {
          console.error('getAvailability error', err?.message || err);
          if (err?.code === 'CONFIG') {
            setUpstreamStatus(res, 'CONFIG_ERROR', 'calendar_availability');
            return res.status(200).json({
              response: 'I couldn\'t reach the scheduling system yet. Let me take your preferred time and we\'ll confirm by text.',
              data: { ok: false, reason: 'calendar_not_configured' },
              requestId
            });
          }
          if (err?.code === 'UPSTREAM_CALENDAR_401') {
            setUpstreamStatus(res, 'UPSTREAM_401', 'calendar_availability');
            return res.status(200).json({
              response: 'Calendar authentication failed. Let me take your preferred time and we\'ll confirm by text.',
              data: { ok: false, reason: 'calendar_auth_failed' },
              requestId
            });
          }
          if (err?.code === 'UPSTREAM_CALENDAR_404') {
            setUpstreamStatus(res, 'UPSTREAM_404', 'calendar_availability');
            return res.status(200).json({
              response: 'Calendar service not found. Let me take your preferred time and we\'ll confirm by text.',
              data: { ok: false, reason: 'calendar_not_found' },
              requestId
            });
          }
          if (err?.code === 'UPSTREAM_CALENDAR_UNREACHABLE') {
            setUpstreamStatus(res, 'UPSTREAM_UNREACHABLE', 'calendar_availability');
            return res.status(200).json({
              response: 'Calendar service is unreachable. Let me take your preferred time and we\'ll confirm by text.',
              data: { ok: false, reason: 'calendar_unreachable' },
              requestId
            });
          }
          if (err?.code === 'UPSTREAM_CALENDAR_UNKNOWN') {
            setUpstreamStatus(res, 'UPSTREAM_UNKNOWN', 'calendar_availability');
            return res.status(200).json({
              response: 'Calendar service error. Let me take your preferred time and we\'ll confirm by text.',
              data: { ok: false, reason: 'calendar_error' },
              requestId
            });
          }
          setUpstreamStatus(res, 'INTERNAL_ERROR', 'calendar_availability');
          return res.status(200).json({
            response: 'Something went wrong on my end. Want to try another time?',
            data: { ok: false, error: 'internal' },
            requestId
          });
        }

        const say = slots.length
          ? `I found ${slots.length} openings. Earliest is ${slots[0].startLocal}. Want that one?`
          : `No openings in the next week. Want me to check another day?`;

        response = { response: say, data: { slots }, requestId };
        break;
      }
        
      case 'bookAppointment': {
        const durationM = Number((parameters && parameters.durationM) || 30);

        const startISO = (parameters && (parameters.startISO || parameters.startTime || parameters.desiredTime));
        if (!startISO) {
          response = {
            response: 'What time should I book it for?',
            data: { ok: false, reason: 'missing_start' },
            requestId
          };
          break;
        }
        const endISO = (parameters && (parameters.endISO || parameters.endTime)) || addMinutes(startISO, durationM);
        const title = (parameters && parameters.title) || `Appointment with ${parameters?.customer?.name || 'customer'}`;

        const payload = {
          startISO, endISO, title,
          description: (parameters && parameters.notes) || '',
          customer: {
            name:  parameters?.customer?.name  || undefined,
            phone: parameters?.customer?.phone || undefined,
            email: parameters?.customer?.email || undefined,
          },
          metadata: (parameters && parameters.metadata) || {},
        };

        let result = {};
        try {
          result = await bookAppointment(payload);
          // Enqueue confirmations/reminders if enabled
          const notificationsEnabled = process.env.NOTIFY_SMS === 'true';
          const toPhone = parameters?.phone || parameters?.customer?.phone;
          if (notificationsEnabled && enqueueNow && toPhone && result?.startISO) {
            const start = DateTime.fromISO(result.startISO, { zone: 'utc' }).setZone(TENANT_TZ);
            const friendly = start.toFormat("EEE, MMM d 'at' h:mm a");
            await enqueueNow({ to: toPhone, text: `Your appointment is confirmed for ${friendly}. Reply STOP to opt out.` });

            if (process.env.REMINDER_24H === 'true') {
              const t24 = start.minus({ hours: 24 });
              if (t24 > DateTime.now()) await enqueueAt({ to: toPhone, text: `Reminder: your appointment is tomorrow at ${friendly}.`, sendAtISO: t24.toUTC().toISO() });
            }
            if (process.env.REMINDER_2H === 'true') {
              const t2 = start.minus({ hours: 2 });
              if (t2 > DateTime.now()) await enqueueAt({ to: toPhone, text: `Reminder: your appointment is in 2 hours (${friendly}).`, sendAtISO: t2.toUTC().toISO() });
            }
          }
        } catch (err) {
          console.error('bookAppointment error', err?.message || err);
          if (err?.code === 'CONFIG') {
            setUpstreamStatus(res, 'CONFIG_ERROR', 'calendar_booking');
            return res.status(200).json({
              response: 'I couldn\'t reach the scheduling system yet. Let me take your preferred time and we\'ll confirm by text.',
              data: { ok: false, reason: 'calendar_not_configured' },
              requestId
            });
          }
          if (err?.code === 'UPSTREAM_CALENDAR_401') {
            setUpstreamStatus(res, 'UPSTREAM_401', 'calendar_booking');
            return res.status(200).json({
              response: 'Calendar authentication failed. Let me take your preferred time and we\'ll confirm by text.',
              data: { ok: false, reason: 'calendar_auth_failed' },
              requestId
            });
          }
          if (err?.code === 'UPSTREAM_CALENDAR_404') {
            setUpstreamStatus(res, 'UPSTREAM_404', 'calendar_booking');
            return res.status(200).json({
              response: 'Calendar service not found. Let me take your preferred time and we\'ll confirm by text.',
              data: { ok: false, reason: 'calendar_not_found' },
              requestId
            });
          }
          if (err?.code === 'UPSTREAM_CALENDAR_UNREACHABLE') {
            setUpstreamStatus(res, 'UPSTREAM_UNREACHABLE', 'calendar_booking');
            return res.status(200).json({
              response: 'Calendar service is unreachable. Let me take your preferred time and we\'ll confirm by text.',
              data: { ok: false, reason: 'calendar_unreachable' },
              requestId
            });
          }
          if (err?.code === 'UPSTREAM_CALENDAR_UNKNOWN') {
            setUpstreamStatus(res, 'UPSTREAM_UNKNOWN', 'calendar_booking');
            return res.status(200).json({
              response: 'Calendar service error. Let me take your preferred time and we\'ll confirm by text.',
              data: { ok: false, reason: 'calendar_error' },
              requestId
            });
          }
          setUpstreamStatus(res, 'INTERNAL_ERROR', 'calendar_booking');
          return res.status(200).json({
            response: 'Something went wrong on my end. Want to try another time?',
            data: { ok: false, error: 'internal' },
            requestId
          });
        }

        const confirmedStart = result.startISO || startISO;
        const when = human(confirmedStart, TENANT_TZ);
        const confId = result.confirmationId || result.id || 'pending';

        const say = `Booked for ${when}. Confirmation ${confId}. Anything else I can help with?`;
        response = {
          response: say,
          data: { confirmation: { id: confId, startISO: confirmedStart, endISO } },
          requestId
        };
        break;
      }

      case 'sendSMS':
        const { phoneNumber, message } = parameters || {};
        
        // Validate required parameters
        if (!phoneNumber || !message) {
          response = {
            response: "I need both a phone number and message to send an SMS. Please provide both.",
            success: false,
            error: "Missing required parameters",
            requestId
          };
          break;
        }
        
        // Log SMS attempt
        console.log('📱 Sending SMS:', {
          phoneNumber,
          message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          requestId
        });
        
        // Send the SMS
        const smsResult = await sendSMS(phoneNumber, message);
        
        if (smsResult.success) {
          response = {
            response: `SMS sent successfully to ${phoneNumber}! ${smsResult.simulated ? '(This was a simulation since Twilio is not configured)' : ''}`,
            success: true,
            messageId: smsResult.messageId,
            simulated: smsResult.simulated || false,
            requestId
          };
        } else {
          response = {
            response: `I'm sorry, I couldn't send the SMS to ${phoneNumber}. ${smsResult.error || 'Please check the phone number and try again.'}`,
            success: false,
            error: smsResult.error,
            requestId
          };
        }
        break;
        
      case 'getBusinessHours':
        response = {
          response: "We're open Monday through Friday from 9 AM to 5 PM, and Saturdays from 10 AM to 2 PM. We're closed on Sundays.",
          hours: {
            monday: '9:00 AM - 5:00 PM',
            tuesday: '9:00 AM - 5:00 PM',
            wednesday: '9:00 AM - 5:00 PM',
            thursday: '9:00 AM - 5:00 PM',
            friday: '9:00 AM - 5:00 PM',
            saturday: '10:00 AM - 2:00 PM',
            sunday: 'Closed'
          },
          requestId
        };
        break;
        
      default:
        response = {
          response: "Hello! I'm your AI assistant. I can help you check availability, book appointments, send SMS messages, or answer questions about our business hours. What would you like to do?",
          capabilities: ['checkAvailability', 'bookAppointment', 'sendSMS', 'getBusinessHours'],
          requestId
        };
    }
    
    // Always return 200 for voice AI
    res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ VAPI Simple error:', error);
    
    // Return graceful error for voice AI
    res.status(200).json({
      response: "I'm having a brief technical issue. Please try again in a moment.",
      error: false, // Don't expose errors to voice AI
      requestId
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    endpoint: 'vapi-simple',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 