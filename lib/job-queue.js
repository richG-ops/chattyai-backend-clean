const Bull = require('bull');
const Redis = require('ioredis');

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
  followup: new Bull('followup-queue', redisConfig)
};

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
  
  // Constants
  PRIORITIES: {
    CRITICAL: 10,
    HIGH: 5,
    NORMAL: 0,
    LOW: -5
  }
}; 