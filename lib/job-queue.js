const Bull = require('bull');
const Redis = require('ioredis');

// Sentry for error tracking
let Sentry;
try {
  Sentry = require('@sentry/node');
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
    });
  }
} catch (error) {
  console.warn('Sentry not available for error tracking');
}

// Redis configuration with failover support
const redisConfig = {
  redis: process.env.REDIS_URL || {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  }
};

// Create queues for different job types
const queues = {
  booking: new Bull('booking-queue', redisConfig),
  notification: new Bull('notification-queue', redisConfig),
  calendar: new Bull('calendar-queue', redisConfig),
  analytics: new Bull('analytics-queue', redisConfig),
  followup: new Bull('followup-queue', redisConfig),
  deadLetter: new Bull('dead-letter-queue', redisConfig) // DLQ for failed jobs
};

// Dead Letter Queue monitoring and alerting
const failureThreshold = 0.01; // 1% failure rate threshold
let failureCount = 0;
let totalJobs = 0;

const monitorFailures = () => {
  const failureRate = totalJobs > 0 ? failureCount / totalJobs : 0;
  
  if (failureRate > failureThreshold && totalJobs > 100) {
    console.error(`🚨 High failure rate detected: ${(failureRate * 100).toFixed(2)}%`);
    
    if (Sentry) {
      Sentry.captureMessage(`High job failure rate: ${(failureRate * 100).toFixed(2)}%`, 'error');
    }
    
    // Reset counters after alert
    failureCount = 0;
    totalJobs = 0;
  }
};

// Set up failure monitoring for all queues
Object.values(queues).forEach(queue => {
  if (queue.name !== 'dead-letter-queue') {
    queue.on('failed', (job, err) => {
      failureCount++;
      totalJobs++;
      
      console.error(`❌ Job failed: ${job.queue.name}:${job.name}`, err.message);
      
      // Send to Dead Letter Queue after max attempts
      if (job.attemptsMade >= job.opts.attempts) {
        queues.deadLetter.add('failed-job', {
          originalQueue: job.queue.name,
          originalJob: job.name,
          data: job.data,
          error: err.message,
          attempts: job.attemptsMade,
          timestamp: new Date().toISOString()
        }, {
          removeOnComplete: 1000, // Keep more DLQ records
          removeOnFail: 1000
        });
        
        if (Sentry) {
          Sentry.captureException(err, {
            tags: {
              queue: job.queue.name,
              jobName: job.name,
              attempts: job.attemptsMade
            },
            extra: {
              jobData: job.data
            }
          });
        }
      }
      
      monitorFailures();
    });
    
    queue.on('completed', () => {
      totalJobs++;
      monitorFailures();
    });
  }
});

// Queue configuration
const defaultJobOptions = {
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 500, // Keep last 500 failed jobs
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
};

// Notification queue with rate limiting
queues.notification.concurrency = 10; // Process 10 notifications in parallel

// Add rate limiting for SMS/Email
const rateLimiter = {
  max: 100, // 100 messages
  duration: 1000, // per second
  bounceBack: false // Don't bounce, just delay
};

// Job processors will be defined in separate files
// This is just the queue setup

// Queue monitoring and health checks
const getQueueHealth = async () => {
  const health = {};
  
  for (const [name, queue] of Object.entries(queues)) {
    const counts = await queue.getJobCounts();
    const isPaused = await queue.isPaused();
    
    health[name] = {
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
      paused: isPaused
    };
  }
  
  return health;
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down job queues...');
  
  const closePromises = Object.values(queues).map(queue => queue.close());
  await Promise.all(closePromises);
  
  console.log('All queues closed');
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Audit log helper
const { getDb } = require('../db-config');
async function logAuditEvent(action, userId, details = {}) {
  const db = getDb();
  try {
    await db('audit_logs').insert({
      action,
      user_id: userId,
      details: JSON.stringify(details),
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}

// Export queue functions
module.exports = {
  // Queue instances
  queues,
  
  // Add job to booking queue
  addBookingJob: async (data, options = {}) => {
    return queues.booking.add('process-booking', data, {
      ...defaultJobOptions,
      ...options,
      priority: data.priority || 0
    });
  },
  
  // Add notification job with rate limiting
  addNotificationJob: async (type, data, options = {}) => {
    return queues.notification.add(type, data, {
      ...defaultJobOptions,
      ...options,
      rateLimiter: type === 'sms' ? rateLimiter : undefined
    });
  },
  
  // Add calendar sync job
  addCalendarJob: async (data, options = {}) => {
    return queues.calendar.add('sync-calendar', data, {
      ...defaultJobOptions,
      ...options
    });
  },
  
  // Add analytics job (lower priority)
  addAnalyticsJob: async (event, data, options = {}) => {
    return queues.analytics.add(event, data, {
      ...defaultJobOptions,
      ...options,
      priority: -1, // Lower priority
      delay: 5000 // Delay 5 seconds to not interfere with main flow
    });
  },
  
  // Add follow-up job
  addFollowupJob: async (data, delay, options = {}) => {
    return queues.followup.add('send-followup', data, {
      ...defaultJobOptions,
      ...options,
      delay // Schedule for future
    });
  },
  
  // Utility functions
  getQueueHealth,
  shutdown,
  logAuditEvent,
  
  // Constants
  PRIORITIES: {
    CRITICAL: 10,
    HIGH: 5,
    NORMAL: 0,
    LOW: -5
  }
}; 