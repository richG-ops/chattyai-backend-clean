const Bull = require('bull');
const Twilio = require('twilio');

const REDIS_URL = process.env.REDIS_URL || process.env.QUEUE_REDIS_URL || process.env.BULL_REDIS_URL;
const q = new Bull('notifications', REDIS_URL, { settings: { maxStalledCount: 1 } });

const twilio = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const FROM = process.env.TWILIO_FROM_NUMBER;

q.process('send', async (job) => {
  const { to, text } = job.data || {};
  if (!to || !text || !FROM) return;
  const masked = maskPhone(to);
  try {
    await twilio.messages.create({ from: FROM, to, body: text });
    console.log(`✅ SMS sent → ${masked}`);
  } catch (e) {
    console.warn(`❌ SMS failed → ${masked}: ${e.message}`);
    throw e;
  }
});

function maskPhone(phone) {
  if (!phone) return 'unknown';
  const s = String(phone);
  return s.length > 4 ? `${'*'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}` : s;
}


