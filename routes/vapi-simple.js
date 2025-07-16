const express = require('express');
const router = express.Router();

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
  try {
    const { function: functionName, parameters } = req.body;
    
    console.log('🎙️ VAPI Simple called:', { 
      functionName, 
      parameters,
      timestamp: new Date().toISOString()
    });
    
    let response;
    
    switch (functionName) {
      case 'checkAvailability':
        // Return mock availability for demo
        response = {
          response: "I have availability tomorrow at 10 AM, 2 PM, and 4 PM. Which time works best for you?",
          slots: [
            { time: '10:00 AM', date: 'tomorrow' },
            { time: '2:00 PM', date: 'tomorrow' },
            { time: '4:00 PM', date: 'tomorrow' }
          ]
        };
        break;
        
      case 'bookAppointment':
        const { customerName, customerPhone, customerEmail, date, time } = parameters || {};
        
        // Log booking attempt
        console.log('📅 Booking appointment:', {
          customerName,
          customerPhone,
          customerEmail,
          date,
          time
        });
        
        // TODO: Add actual booking logic here
        // For now, return success response
        response = {
          response: `Perfect${customerName ? ` ${customerName}` : ''}! I've booked your appointment for ${date || 'tomorrow'} at ${time || '10 AM'}. You'll receive a confirmation shortly.`,
          success: true,
          booking: {
            confirmationNumber: `CNF-${Date.now()}`,
            customer: customerName || 'Customer',
            date: date || 'tomorrow',
            time: time || '10 AM',
            email: customerEmail,
            phone: customerPhone
          }
        };
        
        // TODO: Trigger SMS/Email notifications here
        break;

      case 'sendSMS':
        const { phoneNumber, message } = parameters || {};
        
        // Validate required parameters
        if (!phoneNumber || !message) {
          response = {
            response: "I need both a phone number and message to send an SMS. Please provide both.",
            success: false,
            error: "Missing required parameters"
          };
          break;
        }
        
        // Log SMS attempt
        console.log('📱 Sending SMS:', {
          phoneNumber,
          message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
        });
        
        // Send the SMS
        const smsResult = await sendSMS(phoneNumber, message);
        
        if (smsResult.success) {
          response = {
            response: `SMS sent successfully to ${phoneNumber}! ${smsResult.simulated ? '(This was a simulation since Twilio is not configured)' : ''}`,
            success: true,
            messageId: smsResult.messageId,
            simulated: smsResult.simulated || false
          };
        } else {
          response = {
            response: `I'm sorry, I couldn't send the SMS to ${phoneNumber}. ${smsResult.error || 'Please check the phone number and try again.'}`,
            success: false,
            error: smsResult.error
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
          }
        };
        break;
        
      default:
        response = {
          response: "Hello! I'm your AI assistant. I can help you check availability, book appointments, send SMS messages, or answer questions about our business hours. What would you like to do?",
          capabilities: ['checkAvailability', 'bookAppointment', 'sendSMS', 'getBusinessHours']
        };
    }
    
    // Always return 200 for voice AI
    res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ VAPI Simple error:', error);
    
    // Return graceful error for voice AI
    res.status(200).json({
      response: "I'm having a brief technical issue. Please try again in a moment.",
      error: false // Don't expose errors to voice AI
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