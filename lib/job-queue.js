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

// Redis configuration with enhanced failover support
let redisConfig;

// Validate Redis URL format (Senior Dev Team Fix)
if (process.env.REDIS_URL) {
  const redisUrl = process.env.REDIS_URL;
  console.log('🔍 Redis URL validation:', {
    hasProtocol: redisUrl.includes('redis://'),
    length: redisUrl.length,
    sample: redisUrl.substring(0, 20) + '...'
  });
  
  if (!redisUrl.includes('redis://')) {
    console.warn('⚠️ Invalid REDIS_URL format - missing protocol');
    console.warn('Expected format: redis://hostname:port');
    console.warn('Falling back to localhost');
    redisConfig = {
      redis: {
        host: 'localhost',
        port: 6379,
        connectTimeout: 5000,
        lazyConnect: true,
        retryStrategy: () => null // Don't retry localhost
      }
    };
  } else {
    try {
      const url = new URL(redisUrl);
      redisConfig = {
        redis: {
          host: url.hostname,
          port: url.port || 6379,
          password: url.password || undefined,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          connectTimeout: 10000,
          lazyConnect: true,
          retryStrategy: (times) => {
            if (times > 10) {
              console.error('❌ Redis connection failed after 10 retries - running without queues');
              return null;
            }
            const delay = Math.min(times * 1000, 5000);
            console.log(`⚠️ Redis retry ${times} in ${delay}ms`);
            return delay;
          },
          reconnectOnError: (err) => {
            console.error('Redis reconnect on error:', err.message);
            return true;
          }
        }
      };
    } catch (urlError) {
      console.error('❌ Redis URL parsing failed:', urlError.message);
      console.log('🔄 Using localhost fallback');
      redisConfig = {
        redis: {
          host: 'localhost',
          port: 6379,
          connectTimeout: 5000,
          lazyConnect: true,
          retryStrategy: () => null
        }
      };
    }
  }
} else {
  console.log('📝 No REDIS_URL provided - using localhost fallback');
  redisConfig = {
    redis: {
      host: 'localhost',
      port: 6379,
      connectTimeout: 5000,
      lazyConnect: true,
      retryStrategy: () => null
    }
  };
}

// Enhanced queue creation with error handling
function createQueue(name, config) {
  try {
    const queue = new Bull(name, config);
    
    // Add error handlers to prevent crashes
    queue.on('error', (error) => {
      console.error(`❌ Queue ${name} error:`, error.message);
      if (Sentry) {
        Sentry.captureException(error, { tags: { queue: name } });
      }
    });
    
    queue.on('ready', () => {
      console.log(`✅ Queue ${name} ready`);
    });
    
    return queue;
  } catch (error) {
    console.error(`❌ Failed to create queue ${name}:`, error.message);
    // Return a mock queue that logs instead of processing
    return createMockQueue(name);
  }
}

// Mock queue for when Redis is unavailable
function createMockQueue(name) {
  return {
    add: (jobType, data, options = {}) => {
      console.log(`📝 Mock queue ${name}: ${jobType}`, data);
      return Promise.resolve({ id: Date.now(), data });
    },
    process: (processor) => {
      console.log(`📝 Mock queue ${name}: process handler registered`);
    },
    on: (event, handler) => {
      // Mock event handlers
    },
    close: () => Promise.resolve(),
    getHealth: () => ({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      status: 'mock'
    })
  };
}

// Initialize queues with error handling
const queues = {
  booking: createQueue('booking-queue', redisConfig),
  notification: createQueue('notification-queue', redisConfig),
  calendar: createQueue('calendar-queue', redisConfig),
  analytics: createQueue('analytics-queue', redisConfig),
  followup: createQueue('followup-queue', redisConfig),
  deadLetter: createQueue('dead-letter-queue', redisConfig)
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