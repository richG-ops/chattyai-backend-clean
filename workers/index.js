const { queues } = require('../lib/job-queue');
const { processBooking } = require('./booking-processor');
const { processNotification } = require('./notification-processor');

// Configure Sentry for workers
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
    ],
    tracesSampleRate: 0.1,
  });
  global.Sentry = Sentry;
}

// Start all workers
console.log('🚀 Starting job workers...');

// Booking processor
queues.booking.process('process-booking', 5, async (job) => {
  console.log(`[Booking Worker] Processing job ${job.id}`);
  try {
    const result = await processBooking(job);
    console.log(`[Booking Worker] Job ${job.id} completed`);
    return result;
  } catch (error) {
    console.error(`[Booking Worker] Job ${job.id} failed:`, error);
    if (global.Sentry) {
      global.Sentry.captureException(error, {
        tags: { worker: 'booking' },
        extra: { jobId: job.id, data: job.data }
      });
    }
    throw error;
  }
});

// Notification processor
queues.notification.process('*', 10, async (job) => {
  console.log(`[Notification Worker] Processing ${job.name} job ${job.id}`);
  try {
    const result = await processNotification(job);
    console.log(`[Notification Worker] Job ${job.id} completed`);
    return result;
  } catch (error) {
    console.error(`[Notification Worker] Job ${job.id} failed:`, error);
    if (global.Sentry) {
      global.Sentry.captureException(error, {
        tags: { worker: 'notification', type: job.name },
        extra: { jobId: job.id, data: job.data }
      });
    }
    throw error;
  }
});

// Calendar sync processor
queues.calendar.process('sync-calendar', 3, async (job) => {
  console.log(`[Calendar Worker] Processing job ${job.id}`);
  // TODO: Implement calendar sync logic
  return { synced: true };
});

// Analytics processor (low priority)
queues.analytics.process('*', 2, async (job) => {
  console.log(`[Analytics Worker] Processing ${job.name} event`);
  // TODO: Implement analytics processing
  return { processed: true };
});

// Follow-up processor
queues.followup.process('send-followup', 5, async (job) => {
  console.log(`[Followup Worker] Processing job ${job.id}`);
  const { type, bookingId, customerId, leadId } = job.data;
  
  try {
    switch (type) {
      case 'appointment_reminder':
        // TODO: Send appointment reminder
        break;
      case 'hot_lead_followup':
        // TODO: Follow up with hot lead
        break;
      default:
        console.warn(`Unknown followup type: ${type}`);
    }
    return { sent: true };
  } catch (error) {
    console.error(`[Followup Worker] Failed:`, error);
    throw error;
  }
});

// Queue event listeners
Object.entries(queues).forEach(([name, queue]) => {
  queue.on('error', (error) => {
    console.error(`[${name}] Queue error:`, error);
    if (global.Sentry) {
      global.Sentry.captureException(error, {
        tags: { queue: name }
      });
    }
  });
  
  queue.on('stalled', (job) => {
    console.warn(`[${name}] Job ${job.id} stalled`);
  });
  
  queue.on('failed', (job, error) => {
    console.error(`[${name}] Job ${job.id} failed:`, error.message);
  });
  
  queue.on('completed', (job) => {
    console.log(`[${name}] Job ${job.id} completed`);
  });
});

// Health check
setInterval(async () => {
  try {
    const health = await require('../lib/job-queue').getQueueHealth();
    console.log('📊 Queue Health:', JSON.stringify(health, null, 2));
  } catch (error) {
    console.error('Health check failed:', error);
  }
}, 60000); // Every minute

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down workers...');
  await Promise.all(Object.values(queues).map(q => q.close()));
  process.exit(0);
});

console.log('✅ All workers started successfully'); 