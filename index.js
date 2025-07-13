// Clean entry point - no side effects during require
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Create app instance
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check (always first)
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Mount routes - each route file is self-contained
try {
  app.use('/api/vapi-webhook', require('./routes/vapi-webhook-enhanced'));
  app.use('/api/monitoring', require('./routes/monitoring-dashboard'));
  app.use('/vapi', require('./routes/vapi-simple')); // Legacy endpoint
  
  console.log('✅ All routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load routes:', error.message);
  process.exit(1); // Fail fast - don't start with broken routes
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
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
  try {
    require('./db-config').getDb();
    console.log('✅ Database connection verified');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️  Starting without database...');
  }
  
  const server = app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🚀 ChattyAI Backend - PRODUCTION READY');
    console.log('='.repeat(60));
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`🏥 Health: http://localhost:${PORT}/healthz`);
    console.log(`🔌 Webhook: POST ${process.env.WEBHOOK_URL || 'http://localhost:' + PORT}/api/vapi-webhook`);
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
} 