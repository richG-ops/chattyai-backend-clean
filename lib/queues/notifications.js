const Bull = require('bull');

const REDIS_URL = process.env.REDIS_URL || process.env.QUEUE_REDIS_URL || process.env.BULL_REDIS_URL;
if (!REDIS_URL) {
  throw new Error('REDIS_URL is required for notifications queue');
}

const q = new Bull('notifications', REDIS_URL, { settings: { maxStalledCount: 1 } });

async function enqueueNow({ to, text }) {
  if (!to || !text) return;
  const masked = maskPhone(to);
  try {
    console.log(`📨 Queue SMS now → ${masked}`);
    return q.add('send', { to, text }, { attempts: 3, backoff: { type: 'exponential', delay: 3000 } });
  } catch (e) {
    console.warn('⚠️ enqueueNow failed:', e.message);
  }
}

async function enqueueAt({ to, text, sendAtISO }) {
  if (!to || !text || !sendAtISO) return;
  const delay = Math.max(0, new Date(sendAtISO).getTime() - Date.now());
  const masked = maskPhone(to);
  try {
    console.log(`⏰ Queue SMS at ${sendAtISO} → ${masked}`);
    return q.add('send', { to, text }, { delay, attempts: 3, backoff: { type: 'exponential', delay: 3000 } });
  } catch (e) {
    console.warn('⚠️ enqueueAt failed:', e.message);
  }
}

function maskPhone(phone) {
  if (!phone) return 'unknown';
  const s = String(phone);
  return s.length > 4 ? `${'*'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}` : s;
}

module.exports = { q, enqueueNow, enqueueAt };


