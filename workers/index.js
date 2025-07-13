// Main worker process - starts all queue processors
console.log('🚀 Starting ChattyAI Workers...');

// Load environment variables
require('dotenv').config();

// Initialize Sentry for worker monitoring
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    serverName: 'chattyai-workers'
  });
}

// Start all workers
const workers = [];

try {
  // Booking processor
  console.log('📅 Starting booking processor...');
  require('./booking-processor');
  workers.push('booking');
  
  // Notification processor
  console.log('📧 Starting notification processor...');
  require('./notification-processor');
  workers.push('notification');
  
  console.log('='.repeat(50));
  console.log('✅ All workers started successfully');
  console.log(`Active workers: ${workers.join(', ')}`);
  console.log('='.repeat(50));
  
} catch (error) {
  console.error('❌ Failed to start workers:', error);
  process.exit(1);
}

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down workers...`);
  
  // Give workers 30 seconds to finish current jobs
  setTimeout(() => {
    console.error('Forced shutdown after 30s timeout');
    process.exit(1);
  }, 30000);
  
  // Workers will handle their own shutdown
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Keep process alive
process.stdin.resume(); 