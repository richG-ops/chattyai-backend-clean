const Bull = require('bull');
const { nextRunUtc, sendNow } = require('../lib/report/daily-owner');

const REDIS_URL = process.env.REDIS_URL || process.env.QUEUE_REDIS_URL || process.env.BULL_REDIS_URL;
const q = new Bull('owner-report', REDIS_URL, { settings: { maxStalledCount: 1 } });

q.process('ownerDailyReport', async () => {
  await sendNow();
  const next = nextRunUtc();
  await q.add('ownerDailyReport', {}, { delay: Math.max(0, next.toMillis() - Date.now()) });
});

(async () => {
  const next = nextRunUtc();
  await q.add('ownerDailyReport', {}, { delay: Math.max(0, next.toMillis() - Date.now()) });
  console.log(`⏰ Owner report scheduled for ${next.toISO()}`);
})();


