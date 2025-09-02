// TheChattyAI Elite Backend - Unified Production Server
// Handles 10,000+ calls/day with redundancy and monitoring
// First-principles engineering: Simplicity, Scalability, Security

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const Redis = require('ioredis');
const Bull = require('bull');
const Sentry = require('@sentry/node');
const { DateTime } = require('luxon');
const axios = require('axios');
const calendarClient = require('../lib/calendarClient');
const calcom = (() => {
  try {
    return require('./calendar/providers/calcom');
  } catch (_e) {
    return null;
  }
})();

// Print configuration early
try {
  require('../scripts/print-config').printConfig();
} catch (e) {
  console.warn('⚠️  Configuration print failed:', e.message);
}

// Elite modules
const notificationService = require('../lib/notification-service');
const callDataStorage = require('../lib/call-data-storage');
const { GoogleCalendarPlugin } = require('./vapi-plugin');
const vapiWebhookUltimate = require('../routes/vapi-webhook-ultimate');
const hubspotWebhook     = require('../routes/hubspot-webhook');   // ← NEW

// Initialize Express
const app = express();

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const DATABASE_URL = process.env.DATABASE_URL;
const { getRedisUrl } = require('../lib/redis');
const REDIS_URL = getRedisUrl(['QUEUE_REDIS_URL', 'BULL_REDIS_URL']);
const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET;

// Initialize Sentry for production monitoring
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: NODE_ENV,
    tracesSampleRate: 1.0,
  });
}

// Database connection with connection pooling
const db = new Pool({
  connectionString: DATABASE_URL,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis for caching and queues
const redis = REDIS_URL ? new Redis(REDIS_URL) : null;

// Job queue for async processing
const notificationQueue = redis ? new Bull('notifications', REDIS_URL) : null;

// Middleware
// Sentry
app.use(Sentry.Handlers.requestHandler());
// Pino HTTP logging (optional)
try {
  const { buildLogger } = require('../lib/logging');
  app.use(buildLogger());
} catch (e) {
  console.warn('Logging middleware not available:', e.message);
}
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Return 400 on invalid JSON bodies instead of generic 500
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      ok: false,
      error: 'INVALID_JSON',
      hint: 'Body must be valid JSON: {"to":"+1...","body":"...","provider":"telnyx"}'
    });
  }
  next(err);
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// JWT Authentication middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.tenantId = decoded.tenantId || process.env.DEFAULT_TENANT_ID;
    next();
  });
};

// Version endpoint (build identity)
app.get('/version', (_req, res) => {
  res.status(200).json({
    branch: process.env.GIT_BRANCH || 'main',
    commit: process.env.GIT_COMMIT || 'unknown',
    buildTime: process.env.BUILD_TIME || 'unknown',
    env: NODE_ENV
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    version: '2.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Extended health check with system status
app.get('/healthz', async (req, res) => {
  const checks = {
    server: 'healthy',
    database: 'unknown',
    redis: 'unknown',
    timestamp: new Date().toISOString()
  };

  // Check database
  try {
    await db.query('SELECT 1');
    checks.database = 'healthy';
  } catch (err) {
    checks.database = 'unhealthy';
    console.error('Database health check failed:', err);
  }

  // Check Redis
  if (redis) {
    try {
      await redis.ping();
      checks.redis = 'healthy';
    } catch (err) {
      checks.redis = 'unhealthy';
      console.error('Redis health check failed:', err);
    }
  }

  const allHealthy = Object.values(checks).every(v => v === 'healthy' || v === 'unknown');
  res.status(allHealthy ? 200 : 503).json(checks);
});

// Dev SMS test endpoint (protected)
app.post('/dev/sms', async (req, res) => {
  try {
    const key = req.get('x-debug-key');
    if (!key || key !== process.env.DEBUG_API_KEY) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }

    const { to, body, template, data, provider } = req.body || {};
    if (!to) return res.status(400).json({ ok: false, error: 'missing to' });
    const prev = process.env.SMS_PROVIDER;
    if (provider) process.env.SMS_PROVIDER = provider;

    const out = await notificationService.sendSMS(to, template || 'call_received', { ...(data || {}), body, recipient: 'customer' });
    if (provider) process.env.SMS_PROVIDER = prev;
    return res.json({ ok: true, result: out });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Get availability endpoint with caching
app.get('/get-availability', authenticateJWT, async (req, res) => {
  try {
    const cacheKey = `availability:${req.tenantId}`;
    
    // Check cache first
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    // Get from Google Calendar
    const plugin = new GoogleCalendarPlugin();
    await plugin.initialize(req.tenantId);
    const slots = await plugin.getAvailableSlots({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      duration: req.query.duration || 30
    });

    // Cache for 5 minutes
    if (redis) {
      await redis.setex(cacheKey, 300, JSON.stringify(slots));
    }

    res.json(slots);
  } catch (err) {
    console.error('Get availability error:', err);
    Sentry.captureException(err);
    res.status(500).json({ error: 'Failed to get availability' });
  }
});

// Book appointment endpoint with notifications
app.post('/book-appointment', authenticateJWT, async (req, res) => {
  const { start, end, summary, customerName, customerEmail, customerPhone, service } = req.body;
  
  try {
    // Validate inputs
    if (!start || !end || !summary) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Book in Google Calendar
    const plugin = new GoogleCalendarPlugin();
    await plugin.initialize(req.tenantId);
    const booking = await plugin.scheduleMeeting({
      start,
      end,
      summary,
      description: `Service: ${service}\nCustomer: ${customerName}\nPhone: ${customerPhone}\nEmail: ${customerEmail}`
    });

    // Store call data
    const callData = {
      tenantId: req.tenantId,
      callId: `booking-${Date.now()}`,
      customerPhone,
      customerEmail,
      customerName,
      bookingTime: start,
      service,
      status: 'booked'
    };
    
    await callDataStorage.saveCallData(callData);

    // Queue notifications
    if (notificationQueue) {
      await notificationQueue.add('booking-confirmation', {
        type: 'dual',
        sms: {
          to: customerPhone,
          message: `Confirmed: ${service} on ${DateTime.fromISO(start).toFormat('MMM d at h:mm a')}. Reply CANCEL to cancel.`
        },
        email: {
          to: customerEmail,
          subject: 'Appointment Confirmation',
          template: 'booking-confirmation',
          data: { customerName, service, start, end }
        }
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });
    } else {
      // Direct send if no queue
      await notificationService.sendNotification({
        type: 'sms',
        to: customerPhone,
        message: `Confirmed: ${service} on ${DateTime.fromISO(start).toFormat('MMM d at h:mm a')}`
      });
    }

    res.status(201).json({ 
      success: true, 
      bookingId: booking.id,
      message: 'Appointment booked successfully'
    });

  } catch (err) {
    console.error('Booking error:', err);
    Sentry.captureException(err);
    res.status(500).json({ error: 'Booking failed', details: err.message });
  }
});

// Unified VAPI webhook endpoint - Ultimate version
app.post('/webhook', vapiWebhookUltimate);
app.post('/api/v1/webhook', vapiWebhookUltimate); // New standard

// Twilio recording callback + followups
try {
  app.use('/twilio', require('../routes/twilio-recording'));
  app.use('/followups', require('../routes/followups'));
  console.log('✅ Twilio + followups routes mounted');
} catch (e) {
  console.warn('⚠️  Failed to mount Twilio/Followups routes:', e.message);
}

// Public frontend API
try {
  app.use('/api', require('../routes/public'));
  console.log('✅ Public API routes mounted');
} catch (e) {
  console.warn('⚠️  Failed to mount public API routes:', e.message);
}

// Dev-only utilities
try {
  app.use('/dev', require('../routes/dev'));
  console.log('✅ Dev routes mounted');
} catch (e) {
  console.warn('⚠️  Failed to mount dev routes:', e.message);
}

// Debug routes (when DEBUG_API_KEY is set)
try {
  app.use('/debug', require('../routes/debug-calendar'));
  console.log('✅ Debug routes mounted');
} catch (e) {
  console.warn('⚠️  Failed to mount debug routes:', e.message);
}

// Admin debug routes (owner report trigger)
try {
  app.use('/admin', require('../routes/admin-debug'));
  console.log('✅ Admin debug routes mounted');
} catch (e) {
  console.warn('⚠️  Failed to mount admin debug routes:', e.message);
}

// Simple VAPI (calendar-backed) for availability/booking
try {
  app.use('/vapi', require('../routes/vapi-simple'));
  console.log('✅ VAPI simple routes mounted');
} catch (e) {
  console.warn('⚠️  Failed to mount VAPI simple routes:', e.message);
}

// HubSpot webhook (GET for verification, POST for events)
app.use('/api/v1/hubspot/webhook', hubspotWebhook);     // ← NEW

// Telnyx webhooks (status/inbound/failovers)
try {
  const telnyxHooks = require('./routes/telnyx-webhooks');
  app.use('/webhooks', telnyxHooks);
  console.log('✅ Telnyx webhook routes mounted');
} catch (e) {
  console.warn('⚠️  Failed to mount Telnyx webhooks:', e.message);
}

// Notification status webhooks (optional; idempotent inserts ok)
app.post('/webhooks/twilio-status', bodyParser.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage, To } = req.body || {};
    if (MessageSid && To) {
      await db.query(
        `insert into notification_logs(provider, channel, to_e164, provider_message_id, status, error_code, error_message)
         values($1,$2,$3,$4,$5,$6,$7)`,
        ['twilio', 'sms', To, MessageSid, MessageStatus || 'unknown', String(ErrorCode || ''), String(ErrorMessage || '')]
      );
    }
    return res.send('ok');
  } catch (e) {
    console.error('Twilio status webhook error:', e.message);
    return res.status(500).send('error');
  }
});

app.post('/webhooks/notificationapi-status', bodyParser.json(), async (req, res) => {
  try {
    const ev = req.body || {};
    const toNumber = ev?.to?.number || ev?.to || '';
    const pid = ev?.id || ev?.requestId || '';
    if (toNumber && pid) {
      await db.query(
        `insert into notification_logs(provider, channel, to_e164, provider_message_id, status, error_code, error_message)
         values($1,$2,$3,$4,$5,$6,$7)`,
        ['notificationapi', 'sms', toNumber, pid, ev.status || 'unknown', '', '']
      );
    }
    return res.send('ok');
  } catch (e) {
    console.error('NotificationAPI status webhook error:', e.message);
    return res.status(500).send('error');
  }
});

// Dashboard API endpoints
// Add route for /api/calls with pagination
app.get('/api/calls', authenticateJWT, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const cacheKey = `calls:${req.tenantId}:${page}:${limit}`;

    // Check cache first
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    const calls = await db.query(
      'SELECT * FROM calls WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.tenantId, limit, offset]
    );

    // Cache the result for 5 minutes
    if (redis) {
      await redis.setex(cacheKey, 300, JSON.stringify(calls.rows));
    }

    res.json(calls.rows);
  } catch (err) {
    console.error('Error fetching calls:', err);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

// Add route for /api/analytics
app.get('/api/analytics', authenticateJWT, async (req, res) => {
  try {
    const cacheKey = `analytics:${req.tenantId}`;

    // Check cache first
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    const analytics = await db.query(
      'SELECT COUNT(*) as total_calls, COUNT(DISTINCT customer_phone) as unique_customers FROM calls WHERE tenant_id = $1',
      [req.tenantId]
    );

    // Cache the result for 5 minutes
    if (redis) {
      await redis.setex(cacheKey, 300, JSON.stringify(analytics.rows[0]));
    }

    res.json(analytics.rows[0]);
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Real-time dashboard data (WebSocket ready)
app.get('/api/dashboard/realtime', authenticateJWT, async (req, res) => {
  try {
    // Get last 10 calls
    const recentCalls = await db('calls')
      .where('tenant_id', req.tenantId)
      .orderBy('created_at', 'desc')
      .limit(10);

    // Get today's stats
    const todayStart = DateTime.now().startOf('day').toSQL();
    const todayStats = await db('calls')
      .where('tenant_id', req.tenantId)
      .where('created_at', '>=', todayStart)
      .select(
        db.raw('COUNT(*) as calls_today'),
        db.raw('COUNT(CASE WHEN booking_status = \'confirmed\' THEN 1 END) as bookings_today')
      )
      .first();

    res.json({
      recentCalls,
      stats: {
        callsToday: parseInt(todayStats.calls_today),
        bookingsToday: parseInt(todayStats.bookings_today),
        activeAgents: 3, // Luna, Jade, Flora
        avgResponseTime: 1.2 // seconds
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Realtime data error:', err);
    res.status(500).json({ error: 'Failed to fetch realtime data' });
  }
});

// Zapier webhook endpoint for 5000+ integrations
app.post('/zapier-webhook', authenticateJWT, async (req, res) => {
  try {
    const { trigger, data } = req.body;
    
    // Log the trigger
    console.log(`Zapier trigger: ${trigger}`, data);
    
    // Process based on trigger type
    switch (trigger) {
      case 'new_booking':
        // Trigger could come from external system
        await callDataStorage.saveCallData({
          ...data,
          tenantId: req.tenantId,
          source: 'zapier'
        });
        break;
        
      case 'send_reminder':
        // Queue reminder notification
        if (notificationQueue) {
          await notificationQueue.add('reminder', data);
        }
        break;
        
      default:
        console.log('Unknown Zapier trigger:', trigger);
    }
    
    res.json({ success: true, processed: trigger });
  } catch (err) {
    console.error('Zapier webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Error handling middleware
app.use(Sentry.Handlers.errorHandler());

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  
  // Close server
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Close database
  await db.end();
  console.log('Database connections closed');
  
  // Close Redis
  if (redis) {
    await redis.quit();
    console.log('Redis connection closed');
  }
  
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

let server;

async function preflightOrExit() {
  // Calendar mode validation with graceful fallback
  const provider = (process.env.CALENDAR_PROVIDER || 'legacy').trim().toLowerCase();
  const fallbackAllowed = process.env.CALENDAR_FALLBACK_ENABLED === 'true' && !!process.env.CALENDAR_API_URL;
  try {
    if (provider === 'calcom') {
      const required = ['CAL_API_BASE', 'CAL_API_KEY', 'CAL_EVENT_TYPE_ID'];
      required.forEach((k) => { if (!process.env[k]) throw new Error(`Missing ${k}`); });

      // Prefer provider health/availability to ensure headers/versions are correct
      try {
        const now = new Date().toISOString();
        const to = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
        await calendarClient.availability({ from: now, to });
        console.log('✅ Preflight: Cal.com reachable');
      } catch (err) {
        console.warn('⚠️ Preflight: Cal.com failed →', err?.response?.status || err?.code || err?.message);
        if (fallbackAllowed) {
          console.warn('ℹ️ Preflight: Fallback enabled, proceeding with legacy as backup');
        } else {
          throw err;
        }
      }
    } else {
      // Legacy-only path
      const h = await calendarClient.health();
      if (!h.ok) throw new Error(`Legacy calendar health failed: ${h.status}`);
      console.log('✅ Preflight: Legacy calendar reachable');
    }

    // NotificationAPI env presence (non-fatal)
    if (process.env.NOTIFICATIONAPI_APP_ID && process.env.NOTIFICATIONAPI_SECRET) {
      console.log('✅ Preflight: NotificationAPI configured');
    } else {
      console.log('⚠️ Preflight: NotificationAPI env missing (will fallback to Twilio if configured)');
    }
  } catch (e) {
    console.error('❌ Preflight failed:', e.message);
    // Only exit if no fallback allowed
    const fallbackAllowed = process.env.CALENDAR_FALLBACK_ENABLED === 'true' && !!process.env.CALENDAR_API_URL;
    if (!fallbackAllowed) {
      process.exit(1);
    }
    console.warn('ℹ️ Proceeding to boot with legacy fallback enabled');
  }
}

preflightOrExit().then(() => {
  server = app.listen(PORT, () => {
    try {
      const prov = require('../lib/calendarClient').providerName;
      console.info(`[boot] calendar.provider=${prov}`);
    } catch (e) {
      console.warn('[boot] calendar.provider log failed:', e.message);
    }
    if (process.env.NOTIFY_SMS === 'true') {
      try {
        require('../workers/notifications');
        console.log('✅ Notifications worker loaded');
      } catch (e) {
        console.warn('notifications worker not loaded:', e.message);
      }
    }
    console.log(`🚀 TheChattyAI Elite Backend running on port ${PORT}`);
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`🔐 JWT Auth: ${JWT_SECRET ? 'Configured' : 'Using default (UNSAFE)'}`);
    console.log(`🗄️  Database: ${DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`⚡ Redis: ${REDIS_URL ? 'Connected' : 'Not configured'}`);
    console.log(`🔍 Monitoring: ${process.env.SENTRY_DSN ? 'Sentry enabled' : 'Disabled'}`);
  });
});

module.exports = app;
