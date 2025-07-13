const Bottleneck = require('bottleneck');

// Twilio rate limits:
// - Unregistered: 1 TPS (1 message per second)
// - Registered A2P 10DLC: varies by trust score
// - Short codes: 100 TPS

// Conservative limiter for unregistered numbers
const twilioLimiter = new Bottleneck({
  minTime: 1000, // 1 second between requests (1 TPS)
  maxConcurrent: 1, // Only 1 request at a time
  reservoir: 60, // Allow bursts up to 60 messages
  reservoirRefreshInterval: 60 * 1000, // Refill every minute
  reservoirRefreshAmount: 60, // Refill to 60
  
  // Handle failures
  retryJitter: 1000, // Add some randomness to retries
  
  // Track performance
  id: 'twilio-sms',
  
  // If Twilio returns 429 (rate limit), wait longer
  on: {
    failed: async (error, jobInfo) => {
      if (error.status === 429) {
        console.warn('⚠️ Twilio rate limit hit, backing off...');
        return 30000; // Wait 30 seconds before retry
      }
    }
  }
});

// Email limiter (more lenient)
const emailLimiter = new Bottleneck({
  minTime: 100, // 10 emails per second max
  maxConcurrent: 5,
  reservoir: 100,
  reservoirRefreshInterval: 60 * 1000,
  reservoirRefreshAmount: 100
});

// Log limiter stats periodically
setInterval(() => {
  const stats = twilioLimiter.counts();
  if (stats.EXECUTING > 0 || stats.QUEUED > 0) {
    console.log('📊 Twilio Limiter Stats:', {
      executing: stats.EXECUTING,
      queued: stats.QUEUED,
      done: stats.DONE
    });
  }
}, 30000); // Every 30 seconds

module.exports = {
  twilioLimiter,
  emailLimiter
}; 