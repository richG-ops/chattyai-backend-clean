const Bull = require('bull');
const Redis = require('ioredis');
const Sentry = require('@sentry/node');
const { getDb } = require('../db-config');

// Initialize Sentry if configured
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
  });
}

// Redis connection
const { getRedisUrl } = require('../lib/redis');
const redis = new Redis(getRedisUrl(['BULL_REDIS_URL', 'QUEUE_REDIS_URL']) || 'redis://localhost:6379');

// Dead Letter Queue processor
const dlqProcessor = async (job) => {
  const { data } = job;
  const db = getDb();
  
  console.error(`🔴 DLQ Processing failed job ${job.id}:`, {
    originalQueue: data.originalQueue,
    originalJob: data.originalJob,
    attempts: data.attempts,
    error: data.error
  });
  
  // Log to database for analysis
  try {
    await db('failed_jobs').insert({
      job_id: job.id,
      queue_name: data.originalQueue,
      job_name: data.originalJob,
      data: JSON.stringify(data.data),
      error_message: data.error,
      attempts: data.attempts,
      failed_at: new Date(data.timestamp),
      created_at: new Date()
    });
  } catch (dbError) {
    console.error('Failed to log DLQ job to database:', dbError);
  }
  
  // Send Sentry alert
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(new Error(`DLQ Job Failed: ${data.originalJob}`), {
      level: 'error',
      tags: {
        queue: data.originalQueue,
        jobType: data.originalJob,
        dlq: true
      },
      extra: {
        jobId: job.id,
        attempts: data.attempts,
        errorMessage: data.error,
        jobData: data.data
      }
    });
  }
  
  // Determine if we should retry
  if (shouldRetry(data)) {
    console.log(`🔄 Attempting to retry job ${data.originalJob}`);
    
    try {
      // Re-queue to original queue with delay
      const originalQueue = new Bull(data.originalQueue, getRedisUrl(['BULL_REDIS_URL', 'QUEUE_REDIS_URL']));
      await originalQueue.add(data.originalJob, data.data, {
        delay: calculateRetryDelay(data.attempts),
        attempts: 1, // Only try once more
        removeOnComplete: true,
        removeOnFail: false
      });
      
      console.log(`✅ Job re-queued to ${data.originalQueue}`);
    } catch (retryError) {
      console.error('Failed to retry job:', retryError);
      
      // Critical alert - manual intervention needed
      if (process.env.SENTRY_DSN) {
        Sentry.captureMessage(`CRITICAL: Failed to retry DLQ job ${job.id}`, 'fatal');
      }
    }
  } else {
    // Job is poison - needs manual intervention
    console.error(`☠️ Poison job detected - manual intervention required`);
    
    // Send critical alert
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(
        `Poison job in DLQ: ${data.originalJob} after ${data.attempts} attempts`,
        'fatal'
      );
    }
    
    // Optionally notify ops team via SMS/Slack
    if (process.env.CRITICAL_ALERTS_ENABLED === 'true') {
      const { addNotificationJob } = require('../lib/job-queue');
      await addNotificationJob('sms', {
        to: process.env.OPS_PHONE || process.env.OWNER_PHONE,
        template: 'critical_dlq_alert',
        data: {
          jobType: data.originalJob,
          queue: data.originalQueue,
          error: data.error,
          attempts: data.attempts
        }
      });
    }
  }
};

// Determine if job should be retried
const shouldRetry = (data) => {
  // Don't retry if already tried too many times
  if (data.attempts >= 5) return false;
  
  // Don't retry certain types of errors
  const permanentErrors = [
    'Invalid phone number',
    'Account suspended',
    'Invalid API key',
    'Quota exceeded'
  ];
  
  return !permanentErrors.some(err => 
    data.error && data.error.toLowerCase().includes(err.toLowerCase())
  );
};

// Calculate exponential backoff delay
const calculateRetryDelay = (attempts) => {
  // 5 min, 15 min, 45 min, 2 hours
  const delays = [300000, 900000, 2700000, 7200000];
  return delays[Math.min(attempts - 1, delays.length - 1)];
};

// Create Bull worker
const dlqWorker = new Bull('dead-letter-queue', getRedisUrl(['BULL_REDIS_URL', 'QUEUE_REDIS_URL']));

// Process jobs
dlqWorker.process(5, dlqProcessor); // Process up to 5 jobs concurrently

// Worker event handlers
dlqWorker.on('completed', (job) => {
  console.log(`✅ DLQ job ${job.id} processed successfully`);
});

dlqWorker.on('failed', (job, err) => {
  console.error(`❌ DLQ job ${job.id} failed:`, err);
  // DLQ job itself failed - this is critical
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, {
      level: 'fatal',
      tags: { dlq: true, critical: true }
    });
  }
});

dlqWorker.on('error', (error) => {
  console.error('DLQ Worker error:', error);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down DLQ worker...');
  await dlqWorker.close();
  await redis.disconnect();
  process.exit(0);
});

// Health check endpoint (for monitoring)
if (process.env.WORKER_HEALTH_PORT) {
  const express = require('express');
  const app = express();
  
  app.get('/health', async (req, res) => {
    try {
      const counts = await dlqWorker.getJobCounts();
      res.json({
        status: 'healthy',
        queue: 'dead-letter-queue',
        jobs: counts,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message
      });
    }
  });
  
  app.listen(process.env.WORKER_HEALTH_PORT, () => {
    console.log(`DLQ health check on port ${process.env.WORKER_HEALTH_PORT}`);
  });
}

console.log('🔴 Dead Letter Queue processor started');
console.log(`Processing failed jobs from all queues...`); 