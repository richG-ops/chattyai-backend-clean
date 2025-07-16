const { getDb } = require('../db-config');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const CircuitBreaker = require('opossum');
const { twilioLimiter } = require('../utils/twilio-limiter');
const { logAuditEvent } = require('../lib/job-queue'); // Import audit log helper

// Initialize providers
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Gmail transporter (primary email)
const gmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// SendGrid transporter (fallback email)
const sendgridTransporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});

// Circuit breakers for failover
const twilioCircuit = new CircuitBreaker(sendSMSViaTwilio, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

const gmailCircuit = new CircuitBreaker(sendEmailViaGmail, {
  timeout: 15000,
  errorThresholdPercentage: 30,
  resetTimeout: 60000
});

// Notification templates
const templates = {
  sms: {
    booking_confirmation: (data) => 
      `Hi ${data.customerName}! Your ${data.serviceType} is confirmed for ${data.appointmentDate} at ${data.appointmentTime}. Reply CANCEL to cancel. 💫 Meet Luna: https://luna-visual-server.onrender.com`,
    
    owner_new_booking: (data) =>
      `🚨 NEW BOOKING!\n${data.customerName}\n📱 ${data.customerPhone}\n📅 ${data.appointmentDate} at ${data.appointmentTime}\n💼 ${data.serviceType}`,
    
    appointment_reminder: (data) =>
      `Hi ${data.customerName}! Just a reminder about your ${data.serviceType} tomorrow at ${data.appointmentTime}. See you then! Reply CANCEL to cancel.`,
    
    urgent_complaint: (data) =>
      `⚠️ URGENT COMPLAINT\nFrom: ${data.customerPhone}\nIssue: ${data.complaint}\nCall ID: ${data.callId}\nPlease call back ASAP!`,
    
    new_call_alert: (data) =>
      `📞 NEW CALL ALERT!\n${data.callerName}\n📱 ${data.callerPhone}\n📧 ${data.callerEmail}\n⏱️ ${data.duration}s\n📋 ${data.callSummary}\n${data.timestamp}`,
    
    call_followup: (data) =>
      `Hi ${data.callerName}! Thanks for calling ${data.businessName}. We'll follow up soon! Questions? Call ${data.ownerPhone}. 💫 Meet Luna: https://luna-visual-server.onrender.com`
  },
  
  email: {
    booking_confirmation: (data) => ({
      subject: `Appointment Confirmed - ${data.appointmentDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <img src="https://luna-visual-server.onrender.com/luna.gif" alt="Luna" style="width: 200px; margin: 20px auto; display: block;">
          
          <h2>Hi ${data.customerName}! 👋</h2>
          
          <p>Your appointment is confirmed!</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Appointment Details</h3>
            <p><strong>Service:</strong> ${data.serviceType}</p>
            <p><strong>Date:</strong> ${data.appointmentDate}</p>
            <p><strong>Time:</strong> ${data.appointmentTime}</p>
            ${data.calendarLink ? `<p><a href="${data.calendarLink}" style="color: #007bff;">Add to Google Calendar</a></p>` : ''}
          </div>
          
          <p>Need to reschedule? Just reply to this email or call us.</p>
          
          <p>See you soon!<br>
          Luna & The Team 🤖✨</p>
        </div>
      `
    }),
    
    owner_new_booking: (data) => ({
      subject: `New Booking: ${data.customerName} - ${data.appointmentDate}`,
      html: `
        <h3>New Appointment Booked via AI</h3>
        <p><strong>Customer:</strong> ${data.customerName}</p>
        <p><strong>Phone:</strong> ${data.customerPhone}</p>
        <p><strong>Service:</strong> ${data.serviceType}</p>
        <p><strong>Date/Time:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
      `
    }),
    
    new_call_report: (data) => ({
      subject: `Call Report: ${data.callerName} - ${data.timestamp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>📞 Call Report from Luna AI</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3>Call Details</h3>
            <p><strong>Caller:</strong> ${data.callerName}</p>
            <p><strong>Phone:</strong> ${data.callerPhone}</p>
            <p><strong>Email:</strong> ${data.callerEmail}</p>
            <p><strong>Duration:</strong> ${data.duration} seconds</p>
            <p><strong>Time:</strong> ${data.timestamp}</p>
            <p><strong>Call ID:</strong> ${data.callId}</p>
            ${data.recordingUrl ? `<p><strong>Recording:</strong> <a href="${data.recordingUrl}">Listen</a></p>` : ''}
          </div>
          
          ${data.qaPairs && data.qaPairs.length > 0 ? `
          <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3>Key Questions & Answers</h3>
            ${data.qaPairs.map(qa => `
              <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 5px;">
                <p><strong>Q:</strong> ${qa.question}</p>
                <p><strong>A:</strong> ${qa.answer}</p>
                <p><small><em>Intent: ${qa.intent}</em></small></p>
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          ${data.transcript ? `
          <div style="background: #f1f8e9; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3>Full Transcript</h3>
            <p style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${data.transcript}</p>
          </div>
          ` : ''}
          
          <p style="text-align: center; color: #666; font-size: 12px;">
            Generated by Luna AI • TheChattyAI System
          </p>
        </div>
      `
    }),
    
    call_followup: (data) => ({
      subject: `Thank you for calling ${data.businessName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <img src="https://luna-visual-server.onrender.com/luna.gif" alt="Luna" style="width: 150px; margin: 20px auto; display: block;">
          
          <h2>Hi ${data.callerName}! 👋</h2>
          
          <p>Thank you for calling ${data.businessName}. It was great speaking with you!</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3>What's Next?</h3>
            <p>Our team will review your call and follow up with you soon. If you have any immediate questions, please don't hesitate to reach out.</p>
            
            <p><strong>Contact Us:</strong></p>
            <p>📞 Phone: <a href="tel:${data.ownerPhone}">${data.ownerPhone}</a></p>
            <p>📧 Email: <a href="mailto:${data.ownerEmail}">${data.ownerEmail}</a></p>
          </div>
          
          <p style="text-align: center;">
            <a href="https://luna-visual-server.onrender.com" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">💫 Meet Luna AI</a>
          </p>
          
          <p style="text-align: center; color: #666; font-size: 12px;">
            Call processed at: ${data.timestamp}<br>
            Powered by Luna AI • TheChattyAI System
          </p>
        </div>
      `
    })
  }
};

// Process notification jobs
async function processNotification(job) {
  const { data, name: type } = job;
  const db = getDb();
  
  console.log(`Processing ${type} notification:`, data.to);
  
  try {
    let result;
    
    if (type === 'sms') {
      result = await sendSMS(data);
    } else if (type === 'email') {
      result = await sendEmail(data);
    } else {
      throw new Error(`Unknown notification type: ${type}`);
    }
    
    // Log success
    await logNotification(db, {
      type,
      recipient: data.to,
      template: data.template,
      status: 'sent',
      provider: result.provider,
      job_id: job.id
    });
    // Audit log for notification sent
    await logAuditEvent('notification_sent', data.to, {
      type,
      template: data.template,
      provider: result.provider,
      jobId: job.id
    });
    
    return result;
    
  } catch (error) {
    console.error(`Notification failed:`, error);
    
    // Log failure
    await logNotification(db, {
      type,
      recipient: data.to,
      template: data.template,
      status: 'failed',
      error: error.message,
      job_id: job.id
    });
    // Audit log for notification failure
    await logAuditEvent('notification_failed', data.to, {
      type,
      template: data.template,
      error: error.message,
      jobId: job.id
    });
    
    throw error;
  }
}

// Add opt-out compliance to SMS
function appendOptOut(message) {
  return message + '\nReply STOP to opt-out.';
}

// Enhanced sendSMS with retries and opt-out
async function sendSMS(data) {
  const { to, template, data: templateData, confirmation } = data;
  let message = templates.sms[template]
    ? templates.sms[template](templateData)
    : data.message;
  if (confirmation) {
    message = `We heard your info as: ${JSON.stringify(confirmation)}. Reply YES to confirm or call us.`;
  }
  message = appendOptOut(message);
  if (!message) throw new Error('No message content');

  let attempts = 0;
  const maxAttempts = 3;
  let lastError;
  while (attempts < maxAttempts) {
    try {
      // Send SMS with status callback for delivery tracking
      const result = await twilioClient.messages.create({
        body: message,
        to: to,
        from: process.env.TWILIO_FROM_NUMBER,
        statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL // Set this in env and Twilio dashboard
      });
      return { ...result, provider: 'twilio' };
    } catch (twilioError) {
      lastError = twilioError;
      attempts++;
      if (attempts >= maxAttempts) {
        // Fallback to AWS SNS or another provider if enabled
        if (process.env.AWS_SNS_ENABLED === 'true') {
          return await sendSMSViaAWS(to, message);
        }
        throw twilioError;
      }
      await new Promise(res => setTimeout(res, 1000 * attempts)); // Exponential backoff
    }
  }
  throw lastError;
}

// Send SMS via Twilio (wrapped in circuit breaker)
async function sendSMSViaTwilio(to, message) {
  // Apply rate limiting
  await twilioLimiter.schedule(async () => {
    const result = await twilioClient.messages.create({
      body: message,
      to: to,
      from: process.env.TWILIO_FROM_NUMBER
    });
    
    return {
      messageId: result.sid,
      status: result.status
    };
  });
}

// Send email with fallback
async function sendEmail(data) {
  const { to, template, data: templateData } = data;
  
  // Generate email from template
  const emailContent = templates.email[template]
    ? templates.email[template](templateData)
    : { subject: data.subject, html: data.html };
  
  if (!emailContent.subject || !emailContent.html) {
    throw new Error('Missing email content');
  }
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@chattyai.com',
    to: to,
    ...emailContent
  };
  
  try {
    // Try Gmail first
    const result = await gmailCircuit.fire(mailOptions);
    return { ...result, provider: 'gmail' };
  } catch (gmailError) {
    console.error('Gmail failed, trying SendGrid:', gmailError.message);
    
    // Fallback to SendGrid
    try {
      const result = await sendgridTransporter.sendMail(mailOptions);
      return { messageId: result.messageId, provider: 'sendgrid' };
    } catch (sendgridError) {
      console.error('SendGrid also failed:', sendgridError.message);
      throw gmailError; // Throw original error
    }
  }
}

// Send email via Gmail (wrapped in circuit breaker)
async function sendEmailViaGmail(mailOptions) {
  const result = await gmailTransporter.sendMail(mailOptions);
  return { messageId: result.messageId };
}

// Fallback SMS via AWS SNS
async function sendSMSViaAWS(to, message) {
  const AWS = require('aws-sdk');
  const sns = new AWS.SNS({ region: process.env.AWS_REGION || 'us-east-1' });
  
  const params = {
    Message: message,
    PhoneNumber: to,
    MessageAttributes: {
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Transactional'
      }
    }
  };
  
  const result = await sns.publish(params).promise();
  return {
    messageId: result.MessageId,
    provider: 'aws-sns'
  };
}

// Log notification for analytics
async function logNotification(db, data) {
  try {
    await db('notification_logs').insert({
      ...data,
      created_at: new Date()
    });
  } catch (error) {
    console.error('Failed to log notification:', error);
  }
}

// Circuit breaker event handlers
twilioCircuit.on('open', () => {
  console.error('⚠️ Twilio circuit breaker OPENED - using fallback');
});

twilioCircuit.on('halfOpen', () => {
  console.log('🔄 Twilio circuit breaker half-open - testing...');
});

gmailCircuit.on('open', () => {
  console.error('⚠️ Gmail circuit breaker OPENED - using SendGrid');
});

module.exports = { processNotification }; 