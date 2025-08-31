// ============================================================================
// ENTERPRISE NOTIFICATION SERVICE
// ============================================================================
// Author: Elite Implementation Team
// Purpose: Unified notification system with retry, templates, and analytics
// Features: SMS, Email, WebSocket, Queue integration, Template engine
// ============================================================================

const { DateTime } = require('luxon');
const Bottleneck = require('bottleneck');
const promiseRetry = require('promise-retry');
const notifApi = require('./providers/notificationapi');

// Notification providers
let twilio, sgMail, io;

// Rate limiters for providers
const smsLimiter = new Bottleneck({
  minTime: 100, // 10 SMS per second max
  maxConcurrent: 5,
  reservoir: 100,
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 60 * 1000 // 100 per minute
});

const emailLimiter = new Bottleneck({
  minTime: 50, // 20 emails per second max
  maxConcurrent: 10
});

// Initialize providers with fallbacks
function initializeProviders() {
  // NotificationAPI
  const notifReady = notifApi.init();
  if (notifReady) {
    console.log('✅ Notification Service: NotificationAPI ready');
  }
  // Twilio initialization
  try {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      console.log('✅ Notification Service: Twilio initialized');
    } else {
      throw new Error('Missing Twilio credentials');
    }
  } catch (error) {
    console.warn('⚠️  Twilio unavailable - using mock:', error.message);
    twilio = createMockTwilio();
  }

  // Email adapter
  try {
    const email = require('./email');
    sgMail = { send: email.sendEmail };
    console.log('✅ Notification Service: Email adapter initialized');
  } catch (error) {
    console.warn('⚠️  Email adapter unavailable - using mock:', error.message);
    sgMail = createMockSendGrid();
  }

  // Socket.io initialization (optional)
  try {
    io = require('../index').io;
    console.log('✅ Notification Service: WebSocket initialized');
  } catch (error) {
    console.warn('⚠️  WebSocket unavailable');
    io = null;
  }
}

// Mock providers for development/testing
function createMockTwilio() {
  return {
    messages: {
      create: async (opts) => {
        console.log(`📱 [MOCK SMS] To: ${opts.to}`);
        console.log(`📱 [MOCK SMS] Body: ${opts.body}`);
        return { 
          sid: `mock_${Date.now()}`, 
          status: 'sent',
          to: opts.to,
          from: opts.from,
          body: opts.body,
          dateCreated: new Date()
        };
      }
    }
  };
}

function createMockSendGrid() {
  return {
    send: async (msg) => {
      const messages = Array.isArray(msg) ? msg : [msg];
      messages.forEach(m => {
        console.log(`📧 [MOCK EMAIL] To: ${m.to}`);
        console.log(`📧 [MOCK EMAIL] Subject: ${m.subject}`);
        console.log(`📧 [MOCK EMAIL] Preview: ${(m.text || '').substring(0, 100)}...`);
      });
      return messages.map(() => ({ statusCode: 202 }));
    }
  };
}

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

const templates = {
  sms: {
    booking_confirmation: {
      customer: (data) => 
        `Hi ${data.customerName}! Your ${data.serviceType} is confirmed for ${formatDateTime(data.appointmentDate)}. ` +
        `Save this number for changes. Reply STOP to opt out.`,
      owner: (data) => 
        `🔔 NEW BOOKING!\n` +
        `Customer: ${data.customerName}\n` +
        `Phone: ${data.customerPhone}\n` +
        `Service: ${data.serviceType}\n` +
        `Date: ${formatDateTime(data.appointmentDate)}`
    },
    reminder: {
      customer: (data) => 
        `Reminder: Your ${data.serviceType} is tomorrow at ${formatTime(data.appointmentDate)}. ` +
        `Reply C to confirm or R to reschedule.`,
      owner: (data) => 
        `📅 Tomorrow's appointment:\n${data.customerName} at ${formatTime(data.appointmentDate)}`
    },
    call_received: {
      customer: (data) => 
        `Hi ${data.customerName || 'there'}! Thanks for calling. We'll follow up soon. Reply STOP to opt out.`,
      owner: (data) => 
        `🔔 NEW CALL!\n` +
        `From: ${data.customerPhone || 'Unknown'}\n` +
        `Duration: ${data.duration}s\n` +
        `Outcome: ${data.outcome}`
    }
  },
  email: {
    booking_confirmation: {
      customer: (data) => ({
        subject: `Appointment Confirmation - ${formatDate(data.appointmentDate)}`,
        text: `Your ${data.serviceType} has been confirmed for ${formatDateTime(data.appointmentDate)}.`,
        html: generateBookingEmailHtml(data)
      }),
      owner: (data) => ({
        subject: `🔔 New Booking - ${data.customerName}`,
        text: `New booking received from ${data.customerName} for ${formatDateTime(data.appointmentDate)}.`,
        html: generateOwnerAlertHtml(data)
      })
    },
    reminder: (data) => ({
      subject: `Reminder: Appointment Tomorrow`,
      text: `This is a reminder about your ${data.serviceType} tomorrow at ${formatTime(data.appointmentDate)}.`,
      html: generateReminderEmailHtml(data)
    })
  }
};

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

class NotificationService {
  constructor() {
    initializeProviders();
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  // Refactor sendSMS to use async/await and promise-retry
  async sendSMS(to, template, data, options = {}) {
    const { 
      retries = this.retryAttempts,
      category = 'general',
      priority = 'normal' 
    } = options;

    // Build body from template or direct string
    let body;
    if (typeof template === 'string') {
      body = template;
    } else if (templates.sms[template]) {
      const templateFn = templates.sms[template][(data && data.recipient) || 'customer'];
      body = templateFn(data);
    } else if (data && (data.body || data.message)) {
      body = data.body || data.message;
    } else {
      throw new Error(`SMS template not found: ${template}`);
    }

    // E.164 normalization
    const e164 = this.cleanPhoneNumber(to);

    // Provider order from env
    const order = (process.env.SMS_PROVIDER || 'notificationapi,twilio')
      .toLowerCase()
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const attemptSend = async (provider) => {
      if (provider === 'notificationapi' && notifApi.isReady()) {
        return await notifApi.sendSMS({
          number: e164,
          email: (data && (data.customerEmail || data.email)) || undefined,
          type: process.env.NOTIFICATIONAPI_SMS_TYPE || 'chattyai_',
          data: { body, ...(data || {}) }
        });
      }
      if (provider === 'twilio' && twilio) {
        return await twilio.messages.create({
          body,
          from: process.env.TWILIO_FROM_NUMBER,
          to: e164,
          statusCallback: (options && options.statusCallback) || process.env.TWILIO_STATUS_WEBHOOK
        });
      }
      throw new Error(`Provider not available: ${provider}`);
    };

    let lastErr;
    for (const provider of order) {
      try {
        return await promiseRetry(async (retry, n) => {
          try {
            const res = await attemptSend(provider);
            return res;
          } catch (err) {
            if (n < retries) return retry(err);
            throw err;
          }
        }, { retries });
      } catch (err) {
        lastErr = err;
        continue;
      }
    }

    throw lastErr || new Error('All SMS providers failed');
  }

  // Send Email with retry logic
  async sendEmail(to, template, data, options = {}) {
    const { 
      retries = this.retryAttempts,
      category = 'general',
      priority = 'normal',
      attachments = []
    } = options;

    // Get template content
    let emailContent;
    if (typeof template === 'object') {
      emailContent = template;
    } else if (templates.email[template]) {
      const templateFn = templates.email[template][data.recipient || 'customer'];
      emailContent = templateFn(data);
    } else {
      throw new Error(`Email template not found: ${template}`);
    }

    // Build email message
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@chattyai.com',
      replyTo: process.env.SUPPORT_EMAIL || 'support@chattyai.com',
      ...emailContent,
      attachments,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };

    // Rate-limited send
    return emailLimiter.schedule({ priority: priority === 'high' ? 1 : 5 }, async () => {
      let lastError;
      
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`📧 Sending email (attempt ${attempt}/${retries}) to ${to}`);
          
          const [response] = await sgMail.send(msg);

          // Log success
          await this.logNotification({
            type: 'email',
            recipient: to,
            template,
            status: 'sent',
            provider_id: response.headers['x-message-id'],
            category,
            metadata: { attempt }
          });

          console.log(`✅ Email sent successfully`);
          return response;

        } catch (error) {
          lastError = error;
          console.error(`❌ Email attempt ${attempt} failed:`, error.message);
          
          // Log failure
          await this.logNotification({
            type: 'email',
            recipient: to,
            template,
            status: 'failed',
            error: error.message,
            category,
            metadata: { attempt, errorCode: error.code }
          });

          // Wait before retry
          if (attempt < retries) {
            await this.delay(this.retryDelay * attempt);
          }
        }
      }
      
      throw lastError;
    });
  }

  // Send dual notifications (SMS + Email)
  async sendDualNotifications(bookingData, options = {}) {
    const results = {
      customer: { sms: false, email: false },
      owner: { sms: false, email: false }
    };

    const promises = [];

    // Customer notifications
    if (bookingData.customerPhone) {
      promises.push(
        this.sendSMS(
          bookingData.customerPhone, 
          'booking_confirmation', 
          { ...bookingData, recipient: 'customer' },
          { ...options, category: 'booking' }
        )
        .then(() => { results.customer.sms = true; })
        .catch(err => console.error('Customer SMS failed:', err.message))
      );
    }

    if (bookingData.customerEmail) {
      promises.push(
        this.sendEmail(
          bookingData.customerEmail,
          'booking_confirmation',
          { ...bookingData, recipient: 'customer' },
          { ...options, category: 'booking' }
        )
        .then(() => { results.customer.email = true; })
        .catch(err => console.error('Customer email failed:', err.message))
      );
    }

    // Owner notifications
    const ownerPhone = process.env.OWNER_PHONE;
    const ownerEmail = process.env.OWNER_EMAIL;

    if (ownerPhone) {
      promises.push(
        this.sendSMS(
          ownerPhone,
          'booking_confirmation',
          { ...bookingData, recipient: 'owner' },
          { ...options, category: 'alert', priority: 'high' }
        )
        .then(() => { results.owner.sms = true; })
        .catch(err => console.error('Owner SMS failed:', err.message))
      );
    }

    if (ownerEmail) {
      promises.push(
        this.sendEmail(
          ownerEmail,
          'booking_confirmation',
          { ...bookingData, recipient: 'owner' },
          { ...options, category: 'alert', priority: 'high' }
        )
        .then(() => { results.owner.email = true; })
        .catch(err => console.error('Owner email failed:', err.message))
      );
    }

    // Send real-time update via WebSocket
    if (io && bookingData.tenantId) {
      io.to(bookingData.tenantId).emit('new-booking', {
        customerName: bookingData.customerName,
        appointmentDate: bookingData.appointmentDate,
        serviceType: bookingData.serviceType
      });
    }

    // Wait for all notifications
    await Promise.all(promises);

    return results;
  }

  // Utility functions
  cleanPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if missing
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned; // US default
    }
    
    // Add + prefix
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async logNotification(data) {
    try {
      const { getDb } = require('../db-config');
      const db = getDb();
      
      await db('notification_logs').insert({
        type: data.type,
        recipient: data.recipient,
        template: data.template,
        status: data.status,
        error: data.error,
        provider_id: data.provider_id,
        category: data.category,
        metadata: JSON.stringify(data.metadata || {}),
        created_at: new Date()
      });
    } catch (error) {
      console.error('Failed to log notification:', error.message);
    }
  }
}

// ============================================================================
// TEMPLATE HELPERS
// ============================================================================

function formatDateTime(date) {
  return DateTime.fromISO(date).toLocaleString(DateTime.DATETIME_FULL);
}

function formatDate(date) {
  return DateTime.fromISO(date).toLocaleString(DateTime.DATE_FULL);
}

function formatTime(date) {
  return DateTime.fromISO(date).toLocaleString(DateTime.TIME_SIMPLE);
}

function generateBookingEmailHtml(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #007bff; color: white; padding: 20px; text-align: center; }
    .content { background: #f8f9fa; padding: 30px; margin: 20px 0; }
    .details { background: white; padding: 20px; border-radius: 5px; }
    .footer { text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Appointment Confirmed</h1>
    </div>
    <div class="content">
      <p>Hi ${data.customerName},</p>
      <p>Your appointment has been successfully booked. Here are your details:</p>
      <div class="details">
        <h3>Appointment Details</h3>
        <p><strong>Service:</strong> ${data.serviceType}</p>
        <p><strong>Date & Time:</strong> ${formatDateTime(data.appointmentDate)}</p>
        <p><strong>Duration:</strong> ${data.duration || 60} minutes</p>
      </div>
      <p>We'll send you a reminder 24 hours before your appointment.</p>
      <p>Need to make changes? Reply to this email or call us.</p>
    </div>
    <div class="footer">
      <p>© 2024 ChattyAI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateOwnerAlertHtml(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert { background: #ff6b6b; color: white; padding: 10px; text-align: center; }
    .details { background: #f8f9fa; padding: 20px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert">
      <h2>🔔 New Booking Alert</h2>
    </div>
    <div class="details">
      <h3>Customer Information</h3>
      <table>
        <tr><td><strong>Name:</strong></td><td>${data.customerName}</td></tr>
        <tr><td><strong>Phone:</strong></td><td>${data.customerPhone}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${data.customerEmail || 'Not provided'}</td></tr>
      </table>
      <h3>Appointment Details</h3>
      <table>
        <tr><td><strong>Service:</strong></td><td>${data.serviceType}</td></tr>
        <tr><td><strong>Date & Time:</strong></td><td>${formatDateTime(data.appointmentDate)}</td></tr>
        <tr><td><strong>Source:</strong></td><td>${data.source || 'Voice AI'}</td></tr>
      </table>
    </div>
    <div style="text-align: center; margin-top: 20px;">
      <a href="${process.env.DASHBOARD_URL || '#'}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
    </div>
  </div>
</body>
</html>
  `;
}

function generateReminderEmailHtml(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .reminder { background: #ffc107; color: #333; padding: 20px; text-align: center; }
    .details { background: #f8f9fa; padding: 20px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="reminder">
      <h2>📅 Appointment Reminder</h2>
    </div>
    <div class="details">
      <p>Hi ${data.customerName},</p>
      <p>This is a friendly reminder about your upcoming appointment:</p>
      <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Service:</strong> ${data.serviceType}</p>
        <p><strong>Date & Time:</strong> ${formatDateTime(data.appointmentDate)}</p>
      </div>
      <p>We look forward to seeing you!</p>
      <p>Need to reschedule? Reply to this email or call us.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = new NotificationService(); 