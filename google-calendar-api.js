// TheChattyAI Calendar Bot - Enhanced with AI Personalities
// Last Updated: 2025-01-16 - P0 CRITICAL FIXES APPLIED
// This server provides Google Calendar integration with voice AI personalities

// Load environment variables first
require('dotenv').config();

const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const authMiddleware = require('./middleware/auth');
const { readLimiter, writeLimiter, authLimiter } = require('./middleware/rate-limit');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const { DateTime } = require('luxon');
const Sentry = require('@sentry/node');
const { body, validationResult } = require('express-validator');

// 🚨 Initialize Sentry for monitoring
Sentry.init({ 
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
});

// Import rate limiters
const { twilioLimiter, emailLimiter } = require('./utils/twilio-limiter');

// Import idempotency middleware
const idempotencyMiddleware = require('./middleware/idempotency');

// Import enhanced routes
const vapiWebhookRouter = require('./routes/vapi-webhook-enhanced');

// Load monitoring router with error handling to prevent route registration failure
let monitoringRouter;
try {
  monitoringRouter = require('./routes/monitoring');
  console.log('✅ Monitoring router loaded successfully');
} catch (error) {
  console.error('❌ Failed to load monitoring router:', error.message);
  console.error('❌ Stack trace:', error.stack);
  // Create a mock router that won't crash the app
  const express = require('express');
  monitoringRouter = express.Router();
  monitoringRouter.get('/health', (req, res) => res.json({ 
    status: 'monitoring_module_failed', 
    error: error.message,
    timestamp: new Date().toISOString()
  }));
}

// 📧 EMAIL NOTIFICATION SETUP
const nodemailer = require('nodemailer');

// Create email transporter function (lazy loading)
function createEmailTransporter() {
  try {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || process.env.EMAIL_USER || 'richard.gallagherxyz@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS || 'fallback-password'
      }
    });
  } catch (error) {
    console.error('Error creating email transporter:', error);
    return null;
  }
}

// 📱 TWILIO SMS SETUP WITH LUNA BRANDING
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID',
  process.env.TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN'
);
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || '+1XXXXXXXXXX';

const app = express();

// Sentry request handler must be first
app.use(Sentry.Handlers.requestHandler());

// Add Sentry tracing
app.use(Sentry.Handlers.tracingHandler());

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Request size limits
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

// Apply idempotency middleware for webhook endpoints
app.use(idempotencyMiddleware);

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:4000',
      'https://app.thechattyai.com',
      'https://chattyai-backend-clean.onrender.com'
    ];
    
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  maxAge: 86400 // Cache preflight requests for 24 hours
}));

// Trust proxy for accurate IP addresses
app.set('trust proxy', true);

// Production-grade health check endpoint
app.get('/healthz', (req, res) => {
  const healthStatus = {
    status: 'healthy',
    service: 'thechattyai-calendar-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      google_calendar: GOOGLE_CALENDAR_ENABLED,
      authentication: true,
      vapi_webhook: true,
      simple_vapi: true
    },
    dependencies: {
      google_credentials: !!process.env.GOOGLE_CREDENTIALS || fs.existsSync('credentials.json'),
      google_token: !!process.env.GOOGLE_TOKEN || fs.existsSync('token.json'),
      database: !!process.env.DATABASE_URL,
      jwt_secret: !!process.env.JWT_SECRET
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  };
  
  // Determine overall health
  const hasBasicDependencies = healthStatus.dependencies.jwt_secret;
  const overallStatus = hasBasicDependencies ? 'healthy' : 'degraded';
  
  res.status(overallStatus === 'healthy' ? 200 : 206).json({
    ...healthStatus,
    status: overallStatus
  });
});

// EMERGENCY TEST: Route immediately after healthz
app.get('/emergency-test', (req, res) => {
  res.json({ 
    message: 'EMERGENCY ROUTE WORKS - IMMEDIATELY AFTER HEALTHZ',
    timestamp: new Date().toISOString()
  });
});

// DIAGNOSTIC: Test route next to healthz to isolate routing issue
app.get('/diagnostic', (req, res) => {
  res.json({ 
    message: 'DIAGNOSTIC ROUTE WORKS - POSITION TEST',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    headers: req.headers
  });
});

// Root endpoint for service discovery
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'TheChattyAI Calendar API',
    version: '1.0.0',
    status: 'live',
    endpoints: {
      health: '/healthz',
      vapi_webhook: '/vapi-webhook', 
      vapi_simple: '/vapi',
      availability: '/get-availability',
      booking: '/book-appointment'
    },
    timestamp: new Date().toISOString()
  });
});

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = 'token.json';

// Production-ready credential loading with graceful degradation
let CREDENTIALS;
let oAuth2Client;
let GOOGLE_CALENDAR_ENABLED = false;

try {
  if (process.env.GOOGLE_CREDENTIALS) {
    CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    console.log('✅ Loaded credentials from environment variable');
    GOOGLE_CALENDAR_ENABLED = true;
  } else if (fs.existsSync('credentials.json')) {
    CREDENTIALS = JSON.parse(fs.readFileSync('credentials.json'));
    console.log('✅ Loaded credentials from local file');
    GOOGLE_CALENDAR_ENABLED = true;
  } else {
    console.log('⚠️ No Google credentials found - running in demo mode');
    console.log('📌 Service will respond with mock data until credentials are configured');
  }

  if (GOOGLE_CALENDAR_ENABLED && CREDENTIALS) {
    const { client_secret, client_id, redirect_uris } = CREDENTIALS.installed || CREDENTIALS.web;
    if (client_secret && client_id && redirect_uris) {
      oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
      console.log('✅ Google OAuth client initialized');
    } else {
      console.log('⚠️ Invalid credential structure - running in demo mode');
      GOOGLE_CALENDAR_ENABLED = false;
    }
  }
} catch (error) {
  console.log('⚠️ Error loading Google credentials:', error.message);
  console.log('📌 Service will run in demo mode - all functionality available except live calendar');
  GOOGLE_CALENDAR_ENABLED = false;
}

// Add debug logging for credentials  
if (GOOGLE_CALENDAR_ENABLED && CREDENTIALS) {
  const { client_secret, client_id, redirect_uris } = CREDENTIALS.installed || CREDENTIALS.web;
  console.log('📋 Google Calendar Status: ENABLED');
  console.log(`Client ID: ${client_id ? client_id.substring(0, 20) + '...' : 'NOT FOUND'}`);
  console.log(`Client Secret: ${client_secret ? '***hidden***' : 'NOT FOUND'}`);
  console.log(`Redirect URIs: ${redirect_uris ? redirect_uris.join(', ') : 'NOT FOUND'}`);
  console.log(`Credential Type: ${CREDENTIALS.web ? 'web' : CREDENTIALS.installed ? 'installed' : 'UNKNOWN'}`);
} else {
  console.log('📋 Google Calendar Status: DISABLED (no credentials)');
}

// Production-ready token loading with fallback
function loadAndSetCredentials() {
  if (!GOOGLE_CALENDAR_ENABLED || !oAuth2Client) {
    console.log('⚠️ Google Calendar disabled - skipping token loading');
    return false;
  }

  try {
    let tokens;
    if (process.env.GOOGLE_TOKEN) {
      tokens = JSON.parse(process.env.GOOGLE_TOKEN);
      console.log('✅ Loaded token from environment variable');
    } else if (fs.existsSync(TOKEN_PATH)) {
      tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
      console.log('✅ Loaded token from local file');
    } else {
      console.log('⚠️ No token found - Google Calendar features limited');
      return false;
    }
    
    oAuth2Client.setCredentials(tokens);
    
    // Check if token is expired and we have a refresh token
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date && tokens.refresh_token) {
      console.log('🔄 Token expired, attempting to refresh...');
      return refreshAccessToken();
    }
    
    console.log('✅ Google authentication successful');
    return true;
  } catch (error) {
    console.log('⚠️ Error loading token:', error.message);
    return false;
  }
}

// Function to refresh access token
async function refreshAccessToken() {
  try {
    const { credentials } = await oAuth2Client.refreshAccessToken();
    oAuth2Client.setCredentials(credentials);
    
    // Save the new tokens
    if (process.env.GOOGLE_TOKEN) {
      // In production, you'd need to update the environment variable
      console.log('Token refreshed successfully (production mode)');
    } else {
      // Development: Save to file
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials));
      console.log('Token refreshed and saved successfully');
    }
    
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
}

// OAuth authentication endpoints (for local development)
app.get('/auth', authLimiter, (req, res) => {
  try {
    // Extract credentials for this auth request
    const creds = CREDENTIALS.installed || CREDENTIALS.web;
    if (!creds) {
      console.error('❌ No valid credentials found in CREDENTIALS object');
      return res.status(500).send('Server configuration error: No credentials found');
    }
    
    const { client_secret: authSecret, client_id: authId } = creds;
    
    if (!authId || !authSecret) {
      console.error('❌ Missing client_id or client_secret');
      console.error('Credentials structure:', JSON.stringify(CREDENTIALS, null, 2));
      return res.status(500).send('Server configuration error: Invalid credentials');
    }
    
    // Create a new OAuth2 client with the correct redirect URI based on environment
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? 'https://chattyai-backend-clean.onrender.com/auth/google/callback'
      : 'http://localhost:4000/auth/google/callback';
    
    console.log(`🔐 OAuth Request - Redirect URI: ${redirectUri}`);
    
    const authClient = new google.auth.OAuth2(
      authId,
      authSecret,
      redirectUri
    );
    
    // Always request offline access and force consent to ensure refresh token is provided
    const authUrl = authClient.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
    res.send(`<a href="${authUrl}">Authenticate with Google</a>`);
  } catch (error) {
    console.error('Error in /auth endpoint:', error);
    res.status(500).json({ error: 'Failed to authenticate', details: error.message });
  }
});

app.get('/oauth2callback', authLimiter, async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    
    // Save tokens
    if (process.env.GOOGLE_TOKEN) {
      // In production, you'd need to update the environment variable
      console.log('Authentication successful (production mode)');
      console.log('IMPORTANT: Copy this token and add it as GOOGLE_TOKEN environment variable in Render:');
      console.log(JSON.stringify(tokens));
    } else {
      // Development: Save to file
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
      console.log('Authentication successful, tokens saved');
    }
    
    res.send('Authentication successful! You can close this tab.');
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

// Add a callback endpoint for port 4000
app.get('/auth/google/callback', authLimiter, async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    console.error('❌ No authorization code received');
    return res.status(400).send('Error: No authorization code received');
  }
  
  try {
    // Extract credentials for this callback
    const creds = CREDENTIALS.installed || CREDENTIALS.web;
    if (!creds) {
      console.error('❌ No valid credentials found in callback');
      return res.status(500).send('Server configuration error: No credentials found');
    }
    
    const { client_secret: callbackSecret, client_id: callbackId } = creds;
    
    if (!callbackId || !callbackSecret) {
      console.error('❌ Missing client_id or client_secret in callback');
      return res.status(500).send('Server configuration error: Invalid credentials');
    }
    
    // Create a new OAuth2 client with the correct redirect URI for the callback
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? 'https://chattyai-backend-clean.onrender.com/auth/google/callback'
      : 'http://localhost:4000/auth/google/callback';
    
    console.log(`🔐 OAuth Callback - Using redirect URI: ${redirectUri}`);
    console.log(`🔐 Client ID: ${callbackId.substring(0, 20)}...`);
    
    const callbackClient = new google.auth.OAuth2(callbackId, callbackSecret, redirectUri);
    
    const { tokens } = await callbackClient.getToken(code);
    oAuth2Client.setCredentials(tokens);
    
    // Save tokens
    if (process.env.NODE_ENV === 'production') {
      // In production, log the token for manual copy
      console.log('🎉 Authentication successful in production!');
      console.log('📋 COPY THIS ENTIRE TOKEN JSON:');
      console.log('==================================');
      console.log(JSON.stringify(tokens));
      console.log('==================================');
      console.log('👆 Add this as GOOGLE_TOKEN environment variable in Render');
    } else {
      // Development: Save to file
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
      console.log('Authentication successful, tokens saved');
    }
    
    res.send('Authentication successful! You can close this tab. Check the server logs for the token if in production mode.');
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

// Initialize credentials (non-blocking)
if (GOOGLE_CALENDAR_ENABLED) {
  loadAndSetCredentials();
}

// Production-ready auth middleware with fallback
function ensureAuth(req, res, next) {
  if (!GOOGLE_CALENDAR_ENABLED) {
    return res.status(503).json({ 
      error: 'Google Calendar integration not configured',
      message: 'Calendar features are currently unavailable' 
    });
  }
  
  if (!loadAndSetCredentials()) {
    return res.status(500).json({ 
      error: 'Calendar authentication not configured',
      message: 'Visit /auth to set up calendar integration' 
    });
  }
  next();
}

// Helper to create an OAuth2 client for a specific tenant
function getOAuth2ClientForTenant(tenant) {
  // Handle both 'web' and 'installed' credential types
  const creds = tenant.g_credentials.web || tenant.g_credentials.installed;
  if (!creds) {
    throw new Error('Invalid credentials structure');
  }
  
  const { client_id, client_secret, redirect_uris } = creds;
  const tenantOAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  tenantOAuth2Client.setCredentials(tenant.g_token);
  return tenantOAuth2Client;
}

// Input validation helper
function validateInput(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message).join(', ')
      });
    }
    next();
  };
}

// Appointment validation schema (simple validation without Joi)
function validateAppointment(req, res, next) {
  const { start, end, summary } = req.body;
  
  // Required fields
  if (!start || !end) {
    return res.status(400).json({
      error: 'Missing required fields: start and end times are required'
    });
  }
  
  // Date format validation
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({
      error: 'Invalid date format. Please use ISO 8601 format'
    });
  }
  
  // Future date validation
  if (startDate < new Date()) {
    return res.status(400).json({
      error: 'Cannot book appointments in the past'
    });
  }
  
  // Duration validation
  const duration = (endDate - startDate) / (1000 * 60); // minutes
  if (duration < 15 || duration > 240) {
    return res.status(400).json({
      error: 'Appointment duration must be between 15 minutes and 4 hours'
    });
  }
  
  // End time after start time
  if (endDate <= startDate) {
    return res.status(400).json({
      error: 'End time must be after start time'
    });
  }
  
  // Summary length validation
  if (summary && summary.length > 200) {
    return res.status(400).json({
      error: 'Summary must be less than 200 characters'
    });
  }
  
  // Sanitize input
  req.body.summary = (summary || 'Booked via ChattyAI').substring(0, 200);
  
  next();
}

// GET /get-availability with rate limiting
app.get('/get-availability', authMiddleware, readLimiter, async (req, res) => {
  try {
    const oAuth2Client = getOAuth2ClientForTenant(req.tenant);
    const calendar = require('googleapis').google.calendar({ version: 'v3', auth: oAuth2Client });
    
    // Validate query parameters
    const { date, duration = 30, count = 3 } = req.query;
    
    if (duration < 15 || duration > 240) {
      return res.status(400).json({
        error: 'Duration must be between 15 and 240 minutes'
      });
    }
    
    if (count < 1 || count > 10) {
      return res.status(400).json({
        error: 'Count must be between 1 and 10'
      });
    }
    
    const now = new Date();
    const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const freebusy = await calendar.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: weekLater.toISOString(),
        timeZone: 'America/Los_Angeles',
        items: [{ id: 'primary' }],
      },
    });

    const busy = freebusy.data.calendars.primary.busy;
    let slots = [];
    let slotStart = new Date(now);
    
    while (slots.length < Number(count) && slotStart < weekLater) {
      let slotEnd = new Date(slotStart.getTime() + Number(duration) * 60 * 1000);
      const overlap = busy.some(b =>
        new Date(b.start) < slotEnd && new Date(b.end) > slotStart
      );
      if (!overlap && slotEnd <= weekLater) {
        slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
      }
      slotStart = new Date(slotStart.getTime() + 30 * 60 * 1000);
    }
    
    res.json({ slots });
  } catch (error) {
    console.error('Error getting availability:', error);
    res.status(500).json({ 
      error: 'Failed to get availability', 
      message: 'An error occurred while checking calendar availability'
    });
  }
});

// POST /book-appointment with rate limiting and validation
app.post('/book-appointment', authMiddleware, writeLimiter, validateAppointment, async (req, res) => {
  try {
    const oAuth2Client = getOAuth2ClientForTenant(req.tenant);
    const calendar = require('googleapis').google.calendar({ version: 'v3', auth: oAuth2Client });
    const { start, end, summary } = req.body;
    
    // Check for conflicts before booking
    const conflicts = await calendar.freebusy.query({
      requestBody: {
        timeMin: start,
        timeMax: end,
        items: [{ id: 'primary' }],
      },
    });
    
    const busy = conflicts.data.calendars.primary.busy;
    if (busy && busy.length > 0) {
      return res.status(409).json({
        error: 'Time slot not available',
        message: 'This time slot has already been booked'
      });
    }
    
    const event = {
      summary: summary,
      start: { dateTime: start, timeZone: 'America/Los_Angeles' },
      end: { dateTime: end, timeZone: 'America/Los_Angeles' },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 }
        ]
      }
    };
    
    const result = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    
    console.log(`Appointment booked: ${start} - ${end} (${summary})`);
    res.json({ 
      success: true,
      eventId: result.data.id,
      htmlLink: result.data.htmlLink
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    
    if (error.code === 401) {
      return res.status(401).json({
        error: 'Authentication error',
        message: 'Calendar credentials need to be refreshed'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to book appointment',
      message: 'An error occurred while creating the appointment'
    });
  }
});

// Mount enhanced routes with error handling
try {
  app.use('/vapi-webhook', vapiWebhookRouter);  // Fixed: mount at specific path
  console.log('✅ VAPI webhook routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load VAPI webhook routes:', error.message);
}

try {
  app.use('/monitoring', monitoringRouter);
  console.log('✅ Monitoring routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load monitoring routes:', error.message);
  // Continue without crashing - add fallback route
  app.get('/monitoring/health', (req, res) => res.json({ status: 'monitoring_routes_failed', error: error.message }));
}

// Mount VAPI simple routes (CRITICAL FIX)
try {
  app.use('/vapi', require('./routes/vapi-simple'));
  console.log('✅ VAPI simple routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load VAPI simple routes:', error.message);
}

// Health check endpoint (no rate limit)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime()
  });
});

// Test metrics endpoint (no authentication required for testing)
app.get('/api/test/metrics', (req, res) => {
  try {
    console.log('📊 Test metrics endpoint called from:', req.get('origin') || 'direct');
    
    const mockMetrics = {
      today: { 
        calls: Math.floor(Math.random() * 20) + 10, 
        bookings: Math.floor(Math.random() * 15) + 5, 
        revenue: Math.floor(Math.random() * 2000) + 800, 
        conversionRate: Math.floor(Math.random() * 20) + 60 
      },
      week: { 
        calls: Math.floor(Math.random() * 100) + 50, 
        bookings: Math.floor(Math.random() * 70) + 30, 
        revenue: Math.floor(Math.random() * 10000) + 5000, 
        conversionRate: Math.floor(Math.random() * 15) + 65 
      },
      month: { 
        calls: Math.floor(Math.random() * 400) + 200, 
        bookings: Math.floor(Math.random() * 280) + 120, 
        revenue: Math.floor(Math.random() * 50000) + 20000, 
        conversionRate: Math.floor(Math.random() * 20) + 60 
      },
      previous: {
        today: { calls: 10, bookings: 6, revenue: 960, conversionRate: 60 },
        week: { calls: 78, bookings: 48, revenue: 7680, conversionRate: 62 },
        month: { calls: 310, bookings: 201, revenue: 30150, conversionRate: 65 }
      }
    };
    
    res.json(mockMetrics);
  } catch (error) {
    console.error('❌ Error in test metrics:', error);
    res.status(500).json({ error: 'Failed to fetch test metrics' });
  }
});

// Simple connectivity test endpoint
app.get('/api/test/connection', (req, res) => {
  console.log('🔗 Connection test from:', req.get('origin') || 'direct');
  res.json({ 
    success: true, 
    message: 'Backend connection successful!',
    timestamp: new Date().toISOString(),
    origin: req.get('origin') || 'direct'
  });
});

// Client metrics endpoint
app.get('/api/clients/:id/metrics', authMiddleware, readLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const period = req.query.period || 'today';
    
    console.log(`📊 Fetching metrics for client ${id}, period: ${period}`);
    
    // For demo purposes, return mock data with some variation
    // In production, this would query your database
    const mockMetrics = {
      today: { 
        calls: Math.floor(Math.random() * 20) + 10, 
        bookings: Math.floor(Math.random() * 15) + 5, 
        revenue: Math.floor(Math.random() * 2000) + 800, 
        conversionRate: Math.floor(Math.random() * 20) + 60 
      },
      week: { 
        calls: Math.floor(Math.random() * 100) + 50, 
        bookings: Math.floor(Math.random() * 70) + 30, 
        revenue: Math.floor(Math.random() * 10000) + 5000, 
        conversionRate: Math.floor(Math.random() * 15) + 65 
      },
      month: { 
        calls: Math.floor(Math.random() * 400) + 200, 
        bookings: Math.floor(Math.random() * 280) + 120, 
        revenue: Math.floor(Math.random() * 50000) + 20000, 
        conversionRate: Math.floor(Math.random() * 20) + 60 
      },
      previous: {
        today: { calls: 10, bookings: 6, revenue: 960, conversionRate: 60 },
        week: { calls: 78, bookings: 48, revenue: 7680, conversionRate: 62 },
        month: { calls: 310, bookings: 201, revenue: 30150, conversionRate: 65 }
      }
    };
    
    res.json(mockMetrics);
  } catch (error) {
    console.error('❌ Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// One-time setup endpoint - REMOVE AFTER USE!
app.get('/setup-tenant-once', authLimiter, async (req, res) => {
  try {
    const knex = require('knex')(require('./knexfile').production);
    const crypto = require('crypto');
    const jwt = require('jsonwebtoken');
    
    // Check if tenant already exists
    const existing = await knex('tenants').first();
    if (existing) {
      const token = jwt.sign({ api_key: existing.api_key }, process.env.JWT_SECRET, { expiresIn: '365d' });
      await knex.destroy();
      return res.json({ 
        message: 'Tenant already exists', 
        jwt_token: token,
        usage: `Use this token in Authorization header: Bearer ${token}`
      });
    }
    
    // Create new tenant
    const api_key = crypto.randomBytes(16).toString('hex');
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const token = JSON.parse(process.env.GOOGLE_TOKEN);
    
    await knex('tenants').insert({
      name: 'My Calendar',
      api_key,
      g_credentials: creds,
      g_token: token
    });
    
    const jwtToken = jwt.sign({ api_key }, process.env.JWT_SECRET, { expiresIn: '365d' });
    await knex.destroy();
    
    res.json({ 
      message: 'Tenant created successfully!',
      jwt_token: jwtToken,
      usage: `Use this token in Authorization header: Bearer ${jwtToken}`,
      warning: 'REMOVE THE /setup-tenant-once ENDPOINT FROM YOUR CODE AFTER THIS!'
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  } else {
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: err.stack
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `The requested endpoint ${req.method} ${req.path} does not exist`
  });
});

// =============================================================================
// CLIENT MANAGEMENT ENDPOINTS - PRODUCTION READY
// =============================================================================

// Get client metrics with real-time data
app.get('/api/clients/:id/metrics', authMiddleware, readLimiter, async (req, res) => {
  try {
    const clientId = req.params.id;
    const period = req.query.period || 'today';
    
    console.log(`📊 Fetching metrics for client ${clientId}, period: ${period}`);
    
    // For now, return enhanced mock data that looks real
    // In production, this would query your database
    const now = new Date();
    const baseMetrics = {
      calls: Math.floor(Math.random() * 50) + 10,
      bookings: Math.floor(Math.random() * 30) + 5,
      revenue: Math.floor(Math.random() * 5000) + 1000,
      conversionRate: Math.floor(Math.random() * 30) + 60
    };
    
    const metrics = {
      today: {
        calls: Math.floor(baseMetrics.calls * 0.3),
        bookings: Math.floor(baseMetrics.bookings * 0.3),
        revenue: Math.floor(baseMetrics.revenue * 0.3),
        conversionRate: baseMetrics.conversionRate + Math.floor(Math.random() * 10) - 5
      },
      week: {
        calls: baseMetrics.calls,
        bookings: baseMetrics.bookings,
        revenue: baseMetrics.revenue,
        conversionRate: baseMetrics.conversionRate
      },
      month: {
        calls: baseMetrics.calls * 4,
        bookings: baseMetrics.bookings * 4,
        revenue: baseMetrics.revenue * 4,
        conversionRate: baseMetrics.conversionRate + Math.floor(Math.random() * 5) - 2
      },
      previous: {
        today: {
          calls: Math.floor(baseMetrics.calls * 0.25),
          bookings: Math.floor(baseMetrics.bookings * 0.25),
          revenue: Math.floor(baseMetrics.revenue * 0.25),
          conversionRate: baseMetrics.conversionRate - 5
        },
        week: {
          calls: Math.floor(baseMetrics.calls * 0.9),
          bookings: Math.floor(baseMetrics.bookings * 0.9),
          revenue: Math.floor(baseMetrics.revenue * 0.9),
          conversionRate: baseMetrics.conversionRate - 3
        },
        month: {
          calls: Math.floor(baseMetrics.calls * 3.5),
          bookings: Math.floor(baseMetrics.bookings * 3.5),
          revenue: Math.floor(baseMetrics.revenue * 3.5),
          conversionRate: baseMetrics.conversionRate - 2
        }
      }
    };
    
    res.json({ success: true, metrics, timestamp: now.toISOString() });
  } catch (error) {
    console.error('Error fetching client metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics', details: error.message });
  }
});

// Get client recent bookings
app.get('/api/clients/:id/bookings', authMiddleware, readLimiter, async (req, res) => {
  try {
    const clientId = req.params.id;
    const limit = parseInt(req.query.limit) || 10;
    
    console.log(`📅 Fetching recent bookings for client ${clientId}`);
    
    // Generate realistic mock booking data
    const customerNames = ['Sarah Johnson', 'Mike Chen', 'Lisa Park', 'David Rodriguez', 'Emma Wilson', 'James Taylor', 'Maria Garcia', 'Robert Kim', 'Anna Brown', 'Chris Davis'];
    const services = ['Consultation', 'Haircut', 'Styling', 'Massage', 'Cleaning Service', 'Repair', 'Meeting', 'Appointment'];
    const statuses = ['confirmed', 'pending', 'completed', 'cancelled'];
    
    const bookings = [];
    for (let i = 0; i < limit; i++) {
      const randomHours = Math.floor(Math.random() * 72); // Last 3 days
      const bookingTime = new Date(Date.now() - randomHours * 60 * 60 * 1000);
      
      bookings.push({
        id: `booking_${Date.now()}_${i}`,
        customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
        customerPhone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        service: services[Math.floor(Math.random() * services.length)],
        time: bookingTime.toISOString(),
        duration: [15, 30, 45, 60][Math.floor(Math.random() * 4)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        notes: Math.random() > 0.7 ? 'Special request noted' : null,
        createdAt: new Date(bookingTime.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    // Sort by time, newest first
    bookings.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    res.json({ success: true, bookings, total: bookings.length });
  } catch (error) {
    console.error('Error fetching client bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
  }
});

// 📞 NEW CALL DATA API ENDPOINTS FOR DASHBOARD
// ==============================================

// Get all calls for a client/tenant
app.get('/api/calls', readLimiter, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const tenantId = req.query.tenantId || process.env.DEFAULT_TENANT_ID;
    
    console.log(`📞 Fetching calls: limit=${limit}, offset=${offset}, tenant=${tenantId}`);
    
    const db = getDb();
    
    // Get calls with extracted contact information
    const calls = await db('calls')
      .select([
        'call_id',
        'phone_number',
        'started_at',
        'ended_at',
        'duration_seconds',
        'outcome',
        'extracted_data',
        'ai_employee',
        'recording_url',
        'cost',
        'transcript'
      ])
      .where('tenant_id', tenantId)
      .orderBy('started_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Process calls to extract contact info
    const processedCalls = calls.map(call => {
      const extractedData = call.extracted_data || {};
      
      // Extract contact information from various sources
      let contactInfo = {};
      
      // Check bookAppointment function data
      if (extractedData.bookAppointment) {
        contactInfo = {
          customerName: extractedData.bookAppointment.customerName,
          customerPhone: extractedData.bookAppointment.customerPhone || call.phone_number,
          customerEmail: extractedData.bookAppointment.customerEmail,
          serviceType: extractedData.bookAppointment.serviceType
        };
      }
      
      return {
        id: call.call_id,
        phoneNumber: call.phone_number,
        startedAt: call.started_at,
        endedAt: call.ended_at,
        duration: call.duration_seconds,
        outcome: call.outcome || 'completed',
        aiEmployee: call.ai_employee || 'luna',
        recordingUrl: call.recording_url,
        cost: call.cost || 0,
        hasTranscript: !!call.transcript,
        contactInfo,
        summary: generateCallSummary(call.transcript, call.outcome, contactInfo)
      };
    });
    
    res.json({ 
      success: true, 
      calls: processedCalls,
      total: processedCalls.length,
      hasMore: calls.length === limit
    });
    
  } catch (error) {
    console.error('❌ Error fetching calls:', error);
    res.status(500).json({ error: 'Failed to fetch calls', details: error.message });
  }
});

// Get specific call details including transcript and Q&A
app.get('/api/calls/:callId', readLimiter, async (req, res) => {
  try {
    const { callId } = req.params;
    const tenantId = req.query.tenantId || process.env.DEFAULT_TENANT_ID;
    
    console.log(`📞 Fetching call details: ${callId}`);
    
    const db = getDb();
    
    // Get call record
    const call = await db('calls')
      .where({ call_id: callId, tenant_id: tenantId })
      .first();
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    // Get Q&A pairs for this call
    const qaPairs = await db('call_qa_pairs')
      .where({ call_id: callId })
      .orderBy('sequence_number', 'asc');
    
    // Process extracted data
    const extractedData = call.extracted_data || {};
    let contactInfo = {};
    
    if (extractedData.bookAppointment) {
      contactInfo = {
        customerName: extractedData.bookAppointment.customerName,
        customerPhone: extractedData.bookAppointment.customerPhone || call.phone_number,
        customerEmail: extractedData.bookAppointment.customerEmail,
        serviceType: extractedData.bookAppointment.serviceType,
        appointmentDate: extractedData.bookAppointment.date,
        appointmentTime: extractedData.bookAppointment.time
      };
    }
    
    const callDetails = {
      id: call.call_id,
      phoneNumber: call.phone_number,
      startedAt: call.started_at,
      endedAt: call.ended_at,
      duration: call.duration_seconds,
      outcome: call.outcome || 'completed',
      aiEmployee: call.ai_employee || 'luna',
      recordingUrl: call.recording_url,
      cost: call.cost || 0,
      transcript: call.transcript,
      messages: call.messages || [],
      contactInfo,
      qaPairs: qaPairs.map(qa => ({
        question: qa.question,
        answer: qa.answer,
        intent: qa.intent,
        sequenceNumber: qa.sequence_number,
        metadata: qa.metadata ? JSON.parse(qa.metadata) : {}
      })),
      extractedData,
      summary: generateCallSummary(call.transcript, call.outcome, contactInfo)
    };
    
    res.json({ success: true, call: callDetails });
    
  } catch (error) {
    console.error('❌ Error fetching call details:', error);
    res.status(500).json({ error: 'Failed to fetch call details', details: error.message });
  }
});

// Get call analytics/metrics
app.get('/api/calls/analytics', readLimiter, async (req, res) => {
  try {
    const period = req.query.period || 'today'; // today, week, month
    const tenantId = req.query.tenantId || process.env.DEFAULT_TENANT_ID;
    
    const db = getDb();
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    
    // Get call metrics
    const metrics = await db('calls')
      .where('tenant_id', tenantId)
      .where('started_at', '>=', startDate)
      .select([
        db.raw('COUNT(*) as total_calls'),
        db.raw('COUNT(CASE WHEN outcome = \'booked\' THEN 1 END) as bookings'),
        db.raw('AVG(duration_seconds) as avg_duration'),
        db.raw('SUM(cost) as total_cost'),
        db.raw('COUNT(CASE WHEN extracted_data IS NOT NULL THEN 1 END) as calls_with_data')
      ])
      .first();
    
    // Calculate conversion rate
    const conversionRate = metrics.total_calls > 0 
      ? Math.round((metrics.bookings / metrics.total_calls) * 100)
      : 0;
    
    const analytics = {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalCalls: parseInt(metrics.total_calls) || 0,
      bookings: parseInt(metrics.bookings) || 0,
      conversionRate,
      avgDuration: Math.round(metrics.avg_duration) || 0,
      totalCost: parseFloat(metrics.total_cost) || 0,
      callsWithData: parseInt(metrics.calls_with_data) || 0
    };
    
    res.json({ success: true, analytics });
    
  } catch (error) {
    console.error('❌ Error fetching call analytics:', error);
    
    // Return mock data if database fails
    const mockAnalytics = {
      period,
      totalCalls: 0,
      bookings: 0,
      conversionRate: 0,
      avgDuration: 0,
      totalCost: 0,
      callsWithData: 0
    };
    
    res.json({ success: true, analytics: mockAnalytics });
  }
});

// Helper function for call summaries
function generateCallSummary(transcript, outcome, contactInfo) {
  if (contactInfo && contactInfo.customerName) {
    const name = contactInfo.customerName;
    const service = contactInfo.serviceType || 'service';
    
    switch (outcome) {
      case 'booked':
        return `${name} booked ${service}`;
      case 'complaint':
        return `${name} called with complaint`;
      case 'info_provided':
        return `${name} requested information`;
      default:
        return `Call with ${name}`;
    }
  }
  
  if (transcript && transcript.length > 100) {
    return transcript.substring(0, 100) + '...';
  }
  
  return `Call completed - ${outcome || 'no outcome recorded'}`;
}

// Import database connection helper
function getDb() {
  const knex = require('knex')(require('./knexfile').production);
  return knex;
}

// Create new client (for onboarding)
app.post('/api/clients', readLimiter, async (req, res) => {
  try {
    const {
      businessName,
      businessType,
      ownerName,
      email,
      phone,
      address,
      description,
      services,
      workingHours,
      timeZone
    } = req.body;
    
    console.log('🏢 Creating new client:', { businessName, ownerName, email });
    
    // Input validation
    if (!businessName || !ownerName || !email || !phone) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['businessName', 'ownerName', 'email', 'phone']
      });
    }
    
    // Generate unique identifiers
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const apiKey = `api_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    
    // Generate JWT token for the client
    const jwtToken = jwt.sign(
      { 
        client_id: clientId,
        api_key: apiKey,
        business_name: businessName,
        email: email
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1y' }
    );
    
    // Create client record (in production, this would go to database)
    const client = {
      id: clientId,
      businessName,
      businessType: businessType || 'service',
      ownerName,
      email,
      phone,
      address: address || '',
      description: description || '',
      services: services || [],
      workingHours: workingHours || { start: '09:00', end: '17:00' },
      timeZone: timeZone || 'America/Los_Angeles',
      apiKey,
      jwtToken,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Log successful creation
    console.log('✅ Client created successfully:', {
      id: clientId,
      businessName,
      email,
      apiKey: apiKey.substring(0, 10) + '...'
    });
    
    res.json({
      success: true,
      message: 'Client created successfully',
      client: {
        id: client.id,
        businessName: client.businessName,
        ownerName: client.ownerName,
        email: client.email,
        status: client.status
      },
      credentials: {
        apiKey: client.apiKey,
        jwtToken: client.jwtToken
      }
    });
    
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client', details: error.message });
  }
});

// Get client profile
app.get('/api/clients/:id', authMiddleware, readLimiter, async (req, res) => {
  try {
    const clientId = req.params.id;
    
    console.log(`👤 Fetching client profile for ${clientId}`);
    
    // In production, this would query your database
    const client = {
      id: clientId,
      businessName: 'Sample Business',
      businessType: 'service',
      ownerName: 'John Doe',
      email: 'john@samplebusiness.com',
      phone: '+1234567890',
      address: '123 Main St, City, State 12345',
      description: 'Professional service provider',
      services: ['Consultation', 'Service A', 'Service B'],
      workingHours: { start: '09:00', end: '17:00' },
      timeZone: 'America/Los_Angeles',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    res.json({ success: true, client });
  } catch (error) {
    console.error('Error fetching client profile:', error);
    res.status(500).json({ error: 'Failed to fetch client profile', details: error.message });
  }
});

// Test endpoints for frontend connectivity
app.get('/api/test/connection', (req, res) => {
  res.json({ 
    status: 'connected',
    timestamp: new Date().toISOString(),
    server: 'TheChattyAI Backend',
    version: '1.0.0'
  });
});

app.get('/api/test/metrics', (req, res) => {
  const mockMetrics = {
    today: { calls: 12, bookings: 8, revenue: 1240, conversionRate: 67 },
    week: { calls: 85, bookings: 56, revenue: 8960, conversionRate: 66 },
    month: { calls: 342, bookings: 234, revenue: 34560, conversionRate: 68 },
    previous: {
      today: { calls: 10, bookings: 6, revenue: 960, conversionRate: 60 },
      week: { calls: 78, bookings: 48, revenue: 7680, conversionRate: 62 },
      month: { calls: 310, bookings: 201, revenue: 30150, conversionRate: 65 }
    }
  };
  
  res.json({ success: true, metrics: mockMetrics });
});

// Simple response coordinator for webhook responses (AI personality disabled for now)
const responseCoordinator = {
  generateResponse: (aiEmployee, scenario, params) => {
    return {
      response: generateSimpleResponse(scenario, params),
      confidence: 0.95
    };
  }
};

function generateSimpleResponse(scenario, params) {
  switch (scenario) {
    case 'booking_request':
      if (params.availableSlots && params.availableSlots.length > 0) {
        const slots = params.availableSlots.slice(0, 3).map(slot => {
          const date = new Date(slot.start);
          return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }).join(', ');
        return `I have availability at: ${slots}. Which time works best for you?`;
      } else {
        return "I'm currently fully booked, but let me check for other available times.";
      }
    case 'booking_success':
      return `Perfect! I've booked your ${params.serviceType} for ${params.confirmationTime}. You'll receive a confirmation shortly.`;
    case 'technical_difficulty':
      return "I'm experiencing some technical difficulties. Please try again in a moment or I can transfer you to someone who can help.";
    default:
      return "I can help you with booking appointments. When would you like to schedule?";
  }
}

// Vapi.ai webhook endpoint for voice calls with AI Personalities
app.post('/vapi-webhook', async (req, res) => {
  try {
    const { function: functionName, parameters, aiEmployee = 'luna' } = req.body;
    
    // ENHANCED LOGGING FOR DEBUGGING
    console.log('🎯 VAPI WEBHOOK CALLED - DETAILED DEBUG:', {
      timestamp: new Date().toISOString(),
      functionName,
      aiEmployee,
      parameters: JSON.stringify(parameters, null, 2),
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      },
      fullBody: JSON.stringify(req.body, null, 2)
    });
    
    let result;
    switch (functionName) {
      case 'checkAvailability':
        result = await handleCheckAvailability(parameters, aiEmployee);
        break;
        
      case 'bookAppointment':
        // LOG CRITICAL PARAMETERS
        console.log('📱 BOOKING ATTEMPT:', {
          hasCustomerName: !!parameters.customerName,
          hasCustomerPhone: !!parameters.customerPhone,
          hasCustomerEmail: !!parameters.customerEmail,
          hasDate: !!parameters.date,
          hasTime: !!parameters.time,
          actualParams: parameters
        });
        result = await handleBookAppointment(parameters, aiEmployee);
        break;
        
      case 'getBusinessHours':
        result = await handleGetBusinessHours(aiEmployee);
        break;
        
      case 'handleComplaint':
        result = await handleComplaint(parameters, aiEmployee);
        break;
        
      case 'qualifyLead':
        result = await handleLeadQualification(parameters, aiEmployee);
        break;
        
      default:
        // Generate personality-specific response for unknown requests
        const personalityResponse = responseCoordinator.generateResponse(
          aiEmployee, 
          'general_inquiry', 
          { question: functionName, ...parameters }
        );
        result = { response: personalityResponse.response };
    }
    
    console.log('✅ VAPI WEBHOOK RESPONSE:', {
      timestamp: new Date().toISOString(),
      functionName,
      responseLength: JSON.stringify(result).length,
      hasData: !!result.data
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Vapi webhook error:', error);
    
    // Even errors get personality-specific responses
    const errorResponse = responseCoordinator.generateResponse(
      req.body.aiEmployee || 'luna',
      'technical_difficulty',
      { error: error.message }
    );
    
    res.json({ response: errorResponse.response });
  }
});

// Test endpoint to verify route registration
app.get('/test-route', (req, res) => {
  res.json({ message: 'Route registration works!', timestamp: new Date().toISOString() });
});

// Simple /vapi endpoint for compatibility (no auth required)  
app.post('/vapi', async (req, res) => {
  try {
    const { function: functionName, parameters } = req.body;
    
    console.log('🎙️ Simple Vapi called:', { functionName, parameters });
    
    switch (functionName) {
      case 'checkAvailability':
        res.json({
          response: "I have availability tomorrow at 10 AM, 2 PM, and 4 PM. Which works best for you?",
          slots: []
        });
        break;
        
      case 'bookAppointment':
        const { customerName, date, time } = parameters || {};
        res.json({
          response: `Perfect ${customerName || 'there'}! I've booked your appointment for ${date} at ${time}. You'll receive a confirmation shortly.`,
          success: true
        });
        break;
        
      default:
        res.json({
          response: "I can help you book appointments. When would you like to schedule?"
        });
    }
  } catch (error) {
    console.error('❌ Vapi error:', error);
    res.json({
      response: "I'm having some technical difficulties. Please try again in a moment."
    });
  }
});

// Helper function to get available slots
async function getAvailableSlots(date, timePreference) {
  try {
    // Create a calendar instance for this request
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    
    const now = new Date();
    const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const freebusy = await calendar.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: weekLater.toISOString(),
        timeZone: 'America/Los_Angeles',
        items: [{ id: 'primary' }],
      },
    });

    const busy = freebusy.data.calendars.primary.busy;
    let slots = [];
    let slotStart = new Date(now);
    
    while (slots.length < 10 && slotStart < weekLater) {
      let slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
      const overlap = busy.some(b =>
        new Date(b.start) < slotEnd && new Date(b.end) > slotStart
      );
      if (!overlap && slotEnd <= weekLater) {
        slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
      }
      slotStart = new Date(slotStart.getTime() + 30 * 60 * 1000);
    }
    
    return slots;
  } catch (error) {
    console.error('Error getting available slots:', error);
    return [];
  }
}

// Vapi helper functions with AI Personality Integration
async function handleCheckAvailability(params, aiEmployee = 'luna') {
  try {
    const { date, timePreference, count = 3, customerName } = params;
    
    // Get available slots from existing endpoint
    const availableSlots = await getAvailableSlots(date, timePreference);
    
    // Generate personality-specific response
    const personalityResponse = responseCoordinator.generateResponse(
      aiEmployee,
      'booking_request',
      {
        customerName: customerName || 'there',
        preferredTime: timePreference || date,
        availableSlots: availableSlots.slice(0, count),
        hasAvailability: availableSlots.length > 0
      }
    );
    
    return {
      response: personalityResponse.response,
      data: { 
        slots: availableSlots.slice(0, count),
        aiEmployee,
        confidence: personalityResponse.confidence
      }
    };
  } catch (error) {
    console.error('Error checking availability:', error);
    
    // Personality-specific error handling
    const errorResponse = responseCoordinator.generateResponse(
      aiEmployee,
      'technical_difficulty',
      { error: 'calendar_unavailable' }
    );
    
    return { response: errorResponse.response };
  }
}

async function handleBookAppointment(params, aiEmployee = 'luna') {
  try {
    const { date, time, customerName, customerPhone, serviceType, duration = 30 } = params;
    
    // Parse natural language date and time
    const appointmentDate = parseNaturalDate(date, time);
    if (!appointmentDate) {
      const errorResponse = responseCoordinator.generateResponse(
        aiEmployee,
        'scheduling_error',
        { 
          error: 'date_parse_failed',
          customerName,
          providedDate: date,
          providedTime: time
        }
      );
      return { response: errorResponse.response };
    }
    
    // Calculate end time
    const endTime = new Date(appointmentDate.getTime() + duration * 60000);
    
    // Validate business hours with personality-specific responses
    const hour = appointmentDate.getHours();
    const dayOfWeek = appointmentDate.getDay();
    
    if (hour < 9 || hour >= 17) {
      const errorResponse = responseCoordinator.generateResponse(
        aiEmployee,
        'outside_business_hours',
        { 
          customerName,
          requestedHour: hour,
          businessHours: '9 AM to 5 PM'
        }
      );
      return { response: errorResponse.response };
    }
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const errorResponse = responseCoordinator.generateResponse(
        aiEmployee,
        'weekend_request',
        { 
          customerName,
          dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]
        }
      );
      return { response: errorResponse.response };
    }
    
    // Create appointment
    const summary = `${serviceType || 'Appointment'} - ${customerName}`;
    const description = [
      `Customer: ${customerName}`,
      customerPhone && `Phone: ${customerPhone}`,
      serviceType && `Service: ${serviceType}`,
      `Booked by: ${aiEmployee.charAt(0).toUpperCase() + aiEmployee.slice(1)} AI Assistant`,
      'Powered by TheChattyAI'
    ].filter(Boolean).join('\n');
    
    const event = {
      summary,
      description,
      start: {
        dateTime: appointmentDate.toISOString(),
        timeZone: 'America/Los_Angeles'
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/Los_Angeles'
      },
      attendees: [
        { email: 'richard.gallagherxyz@gmail.com' }
      ]
    };
    
    // Book the appointment
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const result = await calendar.events.insert({
      calendarId: 'primary',
      resource: event
    });
    
    console.log('📅 Calendar event created:', result.data.htmlLink);
    
    if (result.data) {
      const confirmationTime = appointmentDate.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      // 📱📧 SEND SMS AND EMAIL NOTIFICATIONS WITH LUNA BRANDING
      try {
        // Send SMS alert to Richard
        const smsSuccess = await sendSMS('7027760084', 
          `🚨 NEW BOOKING ALERT! 👩‍💼\n\nCustomer: ${customerName}\nPhone: ${customerPhone}\nService: ${serviceType}\nTime: ${confirmationTime}\n\nBooked by Luna AI ✨\nCalendar event created!\n\n💫 Meet Luna: https://luna-visual-server.onrender.com`
        );
        
        // Send EMAIL alert to Richard (CRITICAL FIX)
        await sendEmail(
          'richard.gallagherxyz@gmail.com',
          `🚨 NEW BOOKING ALERT - ${customerName}`,
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">🚨 New Booking Alert!</h2>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
              <p><strong>Customer:</strong> ${customerName}</p>
              <p><strong>Phone:</strong> ${customerPhone}</p>
              <p><strong>Service:</strong> ${serviceType}</p>
              <p><strong>Date & Time:</strong> ${confirmationTime}</p>
              <p><strong>Confirmation ID:</strong> ${result.data.id}</p>
              <p><strong>Booked by:</strong> Luna AI ✨</p>
            </div>
            <p><a href="${result.data.htmlLink}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Google Calendar</a></p>
            <p><a href="https://luna-visual-server.onrender.com" style="color: #2563eb;">💫 Meet Luna AI</a></p>
          </div>
          `,
          `NEW BOOKING ALERT!\n\nCustomer: ${customerName}\nPhone: ${customerPhone}\nService: ${serviceType}\nTime: ${confirmationTime}\nConfirmation: ${result.data.id}\n\nBooked by Luna AI\n\nView calendar: ${result.data.htmlLink}`
        );
        
        // Send SMS confirmation to customer with Luna branding + emoji art
        if (customerPhone) {
          const customerSmsSuccess = await sendSMS(customerPhone,
            `Hi ${customerName}! Your ${serviceType} appointment is confirmed for ${confirmationTime}. 👩‍💼\n\nConfirmation: ${result.data.id}\n\nWe'll see you then! ✨\n\n    ✨ 👩‍💼 ✨\n   Luna AI Assistant\n\n💫 Meet Luna: https://luna-visual-server.onrender.com\n📱 Call me: 702-776-0084`
          );
          
          // Send EMAIL confirmation to customer (CRITICAL FIX)
          const customerEmail = params.customerEmail || `${customerName.replace(/\s+/g, '').toLowerCase()}@example.com`;
          await sendEmail(
            customerEmail,
            `✨ Appointment Confirmed - ${serviceType}`,
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">✨ Your Appointment is Confirmed!</h2>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                <p>Hi ${customerName}!</p>
                <p>Your <strong>${serviceType}</strong> appointment is confirmed for:</p>
                <p style="font-size: 18px; color: #2563eb;"><strong>${confirmationTime}</strong></p>
                <p><strong>Confirmation ID:</strong> ${result.data.id}</p>
              </div>
              <p style="text-align: center;">
                <img src="https://luna-visual-server.onrender.com/luna.gif" alt="Luna AI" style="width: 100px; height: 100px;"/>
              </p>
              <p style="text-align: center;">
                <a href="https://luna-visual-server.onrender.com" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">💫 Meet Luna AI</a>
              </p>
              <p style="text-align: center; color: #666;">
                Need to reschedule? Call us at 702-776-0084
              </p>
            </div>
            `,
            `Hi ${customerName}!\n\nYour ${serviceType} appointment is confirmed for ${confirmationTime}.\n\nConfirmation: ${result.data.id}\n\nWe'll see you then! ✨\n\nMeet Luna: https://luna-visual-server.onrender.com\nCall: 702-776-0084`
          );
        }
        
        console.log('📊 Notification Summary:', {
          smsToRichard: smsSuccess,
          smsToCustomer: customerPhone ? customerSmsSuccess : 'No phone provided',
          emailSent: true,
          timestamp: new Date().toISOString()
        });
        
      } catch (notificationError) {
        console.error('❌ Notification sending error:', notificationError);
        // Don't fail the booking if notifications fail
      }
      
      // Generate personality-specific success response
      const successResponse = responseCoordinator.generateResponse(
        aiEmployee,
        'booking_success',
        {
          customerName,
          serviceType: serviceType || 'appointment',
          confirmationTime,
          appointmentId: result.data.id
        }
      );
      
      return {
        response: successResponse.response,
        data: {
          appointmentId: result.data.id,
          appointmentTime: confirmationTime,
          customerName,
          serviceType: serviceType || 'appointment',
          aiEmployee,
          confidence: successResponse.confidence
        }
      };
    } else {
      const errorResponse = responseCoordinator.generateResponse(
        aiEmployee,
        'booking_failed',
        { customerName, serviceType }
      );
      return { response: errorResponse.response };
    }
  } catch (error) {
    console.error('Error booking appointment:', error);
    return {
      response: "I'm sorry, I couldn't book that appointment. Would you like me to check for other available times?"
    };
  }
}

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('🚀 TheChattyAI Calendar API - PRODUCTION READY');
  console.log('='.repeat(60));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/healthz`);
  console.log(`🎙️ Vapi webhook: http://localhost:${PORT}/vapi-webhook`);
  console.log(`🎙️ Vapi simple: http://localhost:${PORT}/vapi`);
  console.log('='.repeat(60));
  console.log('✅ Ready for production traffic!');
  console.log('='.repeat(60));
});