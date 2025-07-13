// Clean entry point - no side effects during require
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Sentry = require('@sentry/node');
const { getDb } = require('./db-config');

// Create app instance
const app = express();

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
  app.use('/api/v1/webhook', require('./routes/vapi-webhook-enhanced'));
  app.use('/api/monitoring', require('./routes/monitoring-dashboard'));
  app.use('/vapi', require('./routes/vapi-simple')); // Legacy endpoint
  
  console.log('✅ All routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load routes:', error.message);
  process.exit(1); // Fail fast - don't start with broken routes
}

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
    const server = app.listen(PORT, () => {
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