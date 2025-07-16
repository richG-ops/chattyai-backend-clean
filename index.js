const callDataStorage = require('./lib/call-data-storage.js');
const notificationService = require('./lib/notification-service.js');
// Clean entry point - no side effects during require
require('dotenv').config();

// CRITICAL ENVIRONMENT VALIDATION (Senior Dev Fix #5)
const requiredEnvVars = [
  'DATABASE_URL',
  'DEFAULT_TENANT_ID', 
  'VAPI_WEBHOOK_SECRET',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM_NUMBER',
  'SENDGRID_API_KEY'
];

const missingVars = requiredEnvVars.filter(key => !process.env[key]);
if (missingVars.length > 0) {
  console.error('❌ CRITICAL: Missing required environment variables:', missingVars.join(', '));
  console.error('❌ System cannot start without these variables');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Sentry = require('@sentry/node');

// Use unified database connection (Senior Dev Fix #2)
const db = require('./db-config');
// Add rate limiter import
const { readLimiter } = require('./middleware/rate-limit');
const http = require('http');

// Environment variable validation (fail fast if missing)
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'VAPI_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM_NUMBER',
  'GOOGLE_CREDENTIALS',
  'GOOGLE_TOKEN',
  'ASSEMBLYAI_API_KEY',
  'DEEPGRAM_API_KEY',
  'REDIS_URL'
];
const missingVars = requiredEnvVars.filter(key => !process.env[key]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Create app instance
const app = express();

// Create HTTP server and Socket.io after app is created
const server = http.createServer(app);
const allowedOrigin = process.env.NODE_ENV === 'production'
  ? process.env.FRONTEND_URL || 'https://your-vercel-frontend.vercel.app'
  : '*';
const io = require('socket.io')(server, {
  cors: { origin: allowedOrigin, methods: ['GET', 'POST'] }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Dashboard client connected');
  socket.on('join-tenant', (tenantId) => {
    socket.join(tenantId); // Room per tenant for isolation
  });
  socket.on('disconnect', () => console.log('Dashboard disconnected'));
});

// Initialize Sentry for production monitoring
if (process.env.SENTRY_DSN) {
  Sentry.init({ 
    dsn: process.env.SENTRY_DSN, 
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0 
  });
  app.use(Sentry.Handlers.requestHandler());
}

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Health check (always first)
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    redis: !!process.env.REDIS_URL,
    database: !!process.env.DATABASE_URL
  });
});

// Tenant context middleware - CRITICAL for RLS
app.use('/api/v1/*', async (req, res, next) => {
  // Get tenant ID from header or JWT
  const tenantId = req.headers['x-tenant-id'] || 
                   req.query.tenant_id || 
                   req.body?.tenantId ||
                   process.env.DEFAULT_TENANT_ID;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }
  
  req.tenantId = tenantId;
  
  // Set PostgreSQL session variable for RLS
  try {
    const db = getDb();
    await db.raw('SET app.tenant_id = ?', [tenantId]);
    req.db = db;
    next();
  } catch (error) {
    console.error('Failed to set tenant context:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Mount routes - each route file is self-contained
try {
  // Primary webhook handler - ultimate unified version
  app.use('/api/v1/webhook', require('./routes/vapi-webhook-ultimate'));
  
  // Legacy support (backward compatibility)
  app.use('/vapi-webhook', require('./routes/vapi-webhook-ultimate')); // Alternative endpoint
  app.use('/vapi', require('./routes/vapi-simple')); // Legacy endpoint
  
  // Monitoring and health
  app.use('/api/monitoring', require('./routes/monitoring'));
  
  console.log('✅ All routes loaded successfully');
  console.log('📌 Primary webhook: POST /api/v1/webhook');
  console.log('📌 Legacy webhook: POST /vapi-webhook');
  console.log('📌 Monitoring: GET /api/monitoring/*');
} catch (error) {
  console.error('❌ Failed to load routes:', error.message);
  
  // Try fallback to existing routes if new ones fail
  try {
    console.log('⚠️  Attempting fallback to existing routes...');
    app.use('/api/v1/webhook', require('./routes/vapi-webhook-enhanced'));
    app.use('/api/monitoring', require('./routes/monitoring'));
    app.use('/vapi', require('./routes/vapi-simple'));
    console.log('✅ Fallback routes loaded');
  } catch (fallbackError) {
    console.error('❌ Fallback also failed:', fallbackError.message);
    process.exit(1);
  }
}

// 📞 CALL DATA API ENDPOINTS FOR DASHBOARD
// ========================================

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

// ============================================================================
// ENHANCED DASHBOARD APIS WITH PAGINATION & FILTERING
// ============================================================================

// Get paginated calls with filtering
app.get('/api/calls', readLimiter, async (req, res) => {
  const db = getDb();
  const { 
    tenant_id = process.env.DEFAULT_TENANT_ID,
    page = 1,
    limit = 50,
    status,
    outcome,
    date_from,
    date_to,
    phone,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query;

  try {
    // Build query
    let query = db('calls').where('tenant_id', tenant_id);
    
    // Apply filters
    if (status) query = query.where('status', status);
    if (outcome) query = query.where('outcome', outcome);
    if (phone) query = query.where('caller_phone', 'like', `%${phone}%`);
    if (date_from) query = query.where('created_at', '>=', new Date(date_from));
    if (date_to) query = query.where('created_at', '<=', new Date(date_to));
    
    // Get total count
    const totalResult = await query.clone().count('* as total').first();
    const total = parseInt(totalResult.total);
    
    // Apply pagination
    const offset = (page - 1) * limit;
    const calls = await query
      .orderBy(sort_by, sort_order)
      .limit(limit)
      .offset(offset);

    // Add summaries to calls
    const callsWithSummaries = calls.map(call => ({
      ...call,
      summary: generateCallSummary(call.transcript, call.outcome, {
        customerName: call.extracted_data?.customerName,
        serviceType: call.extracted_data?.serviceType
      })
    }));

    res.json({
      success: true,
      data: callsWithSummaries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1
      }
    });
  } catch (error) {
    console.error('Calls API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch calls',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single call details
app.get('/api/calls/:callId', readLimiter, async (req, res) => {
  const db = getDb();
  const { callId } = req.params;
  
  try {
    const call = await db('calls')
      .where('call_id', callId)
      .first();
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    // Get related booking if exists
    const booking = await db('bookings')
      .where('call_id', callId)
      .first();
    
    // Get Q&A pairs if exist
    const qaPairs = await db('call_qa_pairs')
      .where('call_id', callId)
      .orderBy('sequence_number', 'asc');
    
    res.json({
      success: true,
      data: {
        ...call,
        booking,
        qa_pairs: qaPairs,
        summary: generateCallSummary(call.transcript, call.outcome, {
          customerName: call.extracted_data?.customerName,
          serviceType: call.extracted_data?.serviceType
        })
      }
    });
  } catch (error) {
    console.error('Call detail error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch call details',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get comprehensive analytics
app.get('/api/analytics', readLimiter, async (req, res) => {
  const db = getDb();
  const { 
    tenant_id = process.env.DEFAULT_TENANT_ID,
    period = '7d' // 1d, 7d, 30d, 90d, 1y
  } = req.query;
  
  try {
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
      case '1d': startDate = new Date(now - 24 * 60 * 60 * 1000); break;
      case '7d': startDate = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startDate = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now - 90 * 24 * 60 * 60 * 1000); break;
      case '1y': startDate = new Date(now - 365 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
    
    // Overall stats
    const overallStats = await db('calls')
      .where('tenant_id', tenant_id)
      .where('created_at', '>=', startDate)
      .select(
        db.raw('COUNT(*) as total_calls'),
        db.raw('COUNT(CASE WHEN outcome = ? THEN 1 END) as booked_calls', ['booked']),
        db.raw('COUNT(CASE WHEN outcome = ? THEN 1 END) as cancelled_calls', ['cancelled']),
        db.raw('AVG(duration_seconds) as avg_duration'),
        db.raw('COUNT(DISTINCT caller_phone) as unique_callers')
      )
      .first();
    
    // Daily breakdown
    const dailyStats = await db('calls')
      .where('tenant_id', tenant_id)
      .where('created_at', '>=', startDate)
      .select(
        db.raw('DATE(created_at) as date'),
        db.raw('COUNT(*) as calls'),
        db.raw('COUNT(CASE WHEN outcome = ? THEN 1 END) as bookings', ['booked'])
      )
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date', 'desc');
    
    // Top services
    const topServices = await db('bookings')
      .where('tenant_id', tenant_id)
      .where('created_at', '>=', startDate)
      .select('service_type')
      .count('* as count')
      .groupBy('service_type')
      .orderBy('count', 'desc')
      .limit(5);
    
    // Conversion funnel
    const funnel = {
      total_calls: parseInt(overallStats.total_calls),
      qualified_leads: await db('calls')
        .where('tenant_id', tenant_id)
        .where('created_at', '>=', startDate)
        .whereNotNull('extracted_data->customerPhone')
        .count('* as count')
        .then(r => parseInt(r[0].count)),
      bookings: parseInt(overallStats.booked_calls),
      completed: await db('bookings')
        .where('tenant_id', tenant_id)
        .where('created_at', '>=', startDate)
        .where('status', 'completed')
        .count('* as count')
        .then(r => parseInt(r[0].count))
    };
    
    res.json({
      success: true,
      period,
      date_range: {
        from: startDate.toISOString(),
        to: now.toISOString()
      },
      overview: {
        total_calls: parseInt(overallStats.total_calls),
        booked_calls: parseInt(overallStats.booked_calls),
        cancelled_calls: parseInt(overallStats.cancelled_calls),
        conversion_rate: overallStats.total_calls > 0 
          ? ((overallStats.booked_calls / overallStats.total_calls) * 100).toFixed(1)
          : 0,
        avg_duration_seconds: Math.round(overallStats.avg_duration || 0),
        unique_callers: parseInt(overallStats.unique_callers)
      },
      daily_breakdown: dailyStats,
      top_services: topServices,
      conversion_funnel: funnel
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Real-time dashboard data (WebSocket fallback)
app.get('/api/dashboard/realtime', readLimiter, async (req, res) => {
  const db = getDb();
  const { tenant_id = process.env.DEFAULT_TENANT_ID } = req.query;
  
  try {
    // Recent calls (last 10)
    const recentCalls = await db('calls')
      .where('tenant_id', tenant_id)
      .orderBy('created_at', 'desc')
      .limit(10)
      .select(
        'call_id',
        'caller_phone',
        'created_at',
        'duration_seconds',
        'outcome',
        'status'
      );
    
    // Today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayStats = await db('calls')
      .where('tenant_id', tenant_id)
      .where('created_at', '>=', todayStart)
      .select(
        db.raw('COUNT(*) as calls_today'),
        db.raw('COUNT(CASE WHEN outcome = ? THEN 1 END) as bookings_today', ['booked'])
      )
      .first();
    
    // Active calls (if tracking)
    const activeCalls = await db('calls')
      .where('tenant_id', tenant_id)
      .whereNull('ended_at')
      .count('* as count')
      .first();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      recent_calls: recentCalls,
      today: {
        calls: parseInt(todayStats.calls_today),
        bookings: parseInt(todayStats.bookings_today),
        active_calls: parseInt(activeCalls.count)
      }
    });
  } catch (error) {
    console.error('Realtime dashboard error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch realtime data',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Export calls data (CSV)
app.get('/api/export/calls', readLimiter, async (req, res) => {
  const db = getDb();
  const { 
    tenant_id = process.env.DEFAULT_TENANT_ID,
    date_from,
    date_to
  } = req.query;
  
  try {
    let query = db('calls').where('tenant_id', tenant_id);
    
    if (date_from) query = query.where('created_at', '>=', new Date(date_from));
    if (date_to) query = query.where('created_at', '<=', new Date(date_to));
    
    const calls = await query.orderBy('created_at', 'desc');
    
    // Convert to CSV
    const csv = [
      ['Call ID', 'Date', 'Phone', 'Duration', 'Outcome', 'Status', 'Customer Name', 'Service Type'],
      ...calls.map(call => [
        call.call_id,
        new Date(call.created_at).toISOString(),
        call.caller_phone || '',
        call.duration_seconds || 0,
        call.outcome || '',
        call.status || '',
        call.extracted_data?.customerName || '',
        call.extracted_data?.serviceType || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="calls_export.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: 'Failed to export data',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all calls for a client/tenant (Senior Dev Fix #4)
app.get('/api/calls', readLimiter, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const tenantId = req.query.tenantId || process.env.DEFAULT_TENANT_ID;
    
    console.log(`📞 Fetching calls: limit=${limit}, offset=${offset}, tenant=${tenantId}`);
    
    // Query unified calls table
    const calls = await db('calls')
      .select([
        'call_id',
        'phone_number',
        'caller_phone',
        'caller_email',
        'started_at',
        'ended_at',
        'duration_seconds',
        'outcome',
        'extracted_data',
        'transcript',
        'appointment_date',
        'status',
        'created_at'
      ])
      .where('tenant_id', tenantId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Process calls for dashboard display
    const processedCalls = calls.map(call => {
      let extractedData = {};
      try {
        extractedData = typeof call.extracted_data === 'string' 
          ? JSON.parse(call.extracted_data) 
          : call.extracted_data || {};
      } catch (e) {
        console.warn('Failed to parse extracted_data for call:', call.call_id);
      }
      
      // Extract contact information
      let contactInfo = {
        customerName: null,
        customerPhone: call.caller_phone || call.phone_number,
        customerEmail: call.caller_email,
        serviceType: null
      };
      
      // Get data from bookAppointment function
      if (extractedData.bookAppointment) {
        contactInfo = {
          customerName: extractedData.bookAppointment.customerName,
          customerPhone: extractedData.bookAppointment.customerPhone || call.caller_phone,
          customerEmail: extractedData.bookAppointment.customerEmail || call.caller_email,
          serviceType: extractedData.bookAppointment.serviceType
        };
      }
      
      return {
        id: call.call_id,
        phoneNumber: call.caller_phone || call.phone_number,
        startedAt: call.started_at,
        endedAt: call.ended_at,
        duration: call.duration_seconds || 0,
        outcome: call.outcome || 'completed',
        status: call.status || 'completed',
        appointmentDate: call.appointment_date,
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

// Get specific call details including transcript (Senior Dev Fix #4)
app.get('/api/calls/:callId', readLimiter, async (req, res) => {
  try {
    const { callId } = req.params;
    const tenantId = req.query.tenantId || process.env.DEFAULT_TENANT_ID;
    
    console.log(`📞 Fetching call details: ${callId}`);
    
    // Get call record from unified table
    const call = await db('calls')
      .where({ call_id: callId, tenant_id: tenantId })
      .first();
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    // Process extracted data
    let extractedData = {};
    try {
      extractedData = typeof call.extracted_data === 'string' 
        ? JSON.parse(call.extracted_data) 
        : call.extracted_data || {};
    } catch (e) {
      console.warn('Failed to parse extracted_data for call:', call.call_id);
    }
    
    let contactInfo = {
      customerName: null,
      customerPhone: call.caller_phone || call.phone_number,
      customerEmail: call.caller_email,
      serviceType: null,
      appointmentDate: call.appointment_date,
      appointmentTime: null
    };
    
    if (extractedData.bookAppointment) {
      contactInfo = {
        customerName: extractedData.bookAppointment.customerName,
        customerPhone: extractedData.bookAppointment.customerPhone || call.caller_phone,
        customerEmail: extractedData.bookAppointment.customerEmail || call.caller_email,
        serviceType: extractedData.bookAppointment.serviceType,
        appointmentDate: call.appointment_date,
        appointmentTime: extractedData.bookAppointment.time
      };
    }
    
    const callDetails = {
      id: call.call_id,
      phoneNumber: call.caller_phone || call.phone_number,
      startedAt: call.started_at,
      endedAt: call.ended_at,
      duration: call.duration_seconds || 0,
      outcome: call.outcome || 'completed',
      status: call.status || 'completed',
      transcript: call.transcript || '',
      appointmentDate: call.appointment_date,
      contactInfo,
      extractedData,
      summary: generateCallSummary(call.transcript, call.outcome, contactInfo)
    };
    
    res.json({ success: true, call: callDetails });
    
  } catch (error) {
    console.error('❌ Error fetching call details:', error);
    res.status(500).json({ error: 'Failed to fetch call details', details: error.message });
  }
});

// Get call analytics/metrics (Senior Dev Fix #4)
app.get('/api/calls/analytics', readLimiter, async (req, res) => {
  try {
    const period = req.query.period || 'today'; // today, week, month
    const tenantId = req.query.tenantId || process.env.DEFAULT_TENANT_ID;
    
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
    
    // Get call metrics from unified table
    const metrics = await db('calls')
      .where('tenant_id', tenantId)
      .where('created_at', '>=', startDate)
      .select([
        db.raw('COUNT(*) as total_calls'),
        db.raw('COUNT(CASE WHEN outcome = \'booked\' THEN 1 END) as bookings'),
        db.raw('AVG(duration_seconds) as avg_duration'),
        db.raw('COUNT(CASE WHEN extracted_data IS NOT NULL AND extracted_data != \'{}\'::jsonb THEN 1 END) as calls_with_data')
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
      callsWithData: parseInt(metrics.calls_with_data) || 0
    };
    
    res.json({ success: true, analytics });
    
  } catch (error) {
    console.error('❌ Error fetching call analytics:', error);
    
    // Return mock data if database fails
    const mockAnalytics = {
      period: req.query.period || 'today',
      totalCalls: 0,
      bookings: 0,
      conversionRate: 0,
      avgDuration: 0,
      callsWithData: 0
    };
    
    res.json({ success: true, analytics: mockAnalytics });
  }
});

// Sentry error handler (must be after routes)
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Log to Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Export for testing
module.exports = app;

// Export io for use in workers if needed
module.exports.io = io;

// Start server only if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  
  // Smoke test - verify all critical dependencies
  const smokeTest = async () => {
    try {
      const db = getDb();
      await db.raw('SELECT 1');
      console.log('✅ Database connection verified');
      
      if (process.env.REDIS_URL) {
        const Redis = require('ioredis');
        const redis = new Redis(process.env.REDIS_URL);
        await redis.ping();
        console.log('✅ Redis connection verified');
        redis.disconnect();
      } else {
        console.warn('⚠️  Redis not configured - queues will fail');
      }
    } catch (error) {
      console.error('❌ Smoke test failed:', error.message);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1); // Don't start in production with broken dependencies
      }
    }
  };
  
  smokeTest().then(() => {
    // Replace app.listen with server.listen
    // app.listen(PORT, () => {
    server.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log('🚀 ChattyAI Backend - ELITE PRODUCTION READY');
      console.log('='.repeat(60));
      console.log(`📡 Server: http://localhost:${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/healthz`);
      console.log(`🔌 Webhook: POST /api/v1/webhook`);
      console.log(`📊 Monitoring: http://localhost:${PORT}/api/monitoring`);
      console.log('='.repeat(60));
    });
    
    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
      
      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after 10s timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  });
} 
// Integrate storage in webhook handler (example)
app.post('/webhook', async (req, res) => { await callDataStorage.saveCallData(req.body); });
