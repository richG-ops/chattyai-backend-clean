const knex = require('../db-config');
const Twilio = require('twilio');
const { DateTime } = require('luxon');

const twilio = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const FROM = process.env.TWILIO_FROM_NUMBER;

async function fetchCounts() {
  const rows = await Promise.all([
    knex.raw("SELECT COUNT(*)::int AS n FROM call_recordings WHERE created_at >= NOW() - INTERVAL '24 hours'"),
    knex.raw("SELECT COUNT(*)::int AS n FROM bookings WHERE created_at >= NOW() - INTERVAL '24 hours'"),
    knex.raw("SELECT COUNT(*)::int AS n FROM notifications_audit WHERE kind='confirm' AND queued_at >= NOW() - INTERVAL '24 hours'"),
    knex.raw("SELECT COUNT(*)::int AS n FROM notifications_audit WHERE kind IN ('reminder24','reminder2') AND queued_at >= NOW() - INTERVAL '24 hours'"),
  ]);
  return {
    calls: rows[0].rows[0].n,
    booked: rows[1].rows[0].n,
    confirms: rows[2].rows[0].n,
    reminders: rows[3].rows[0].n,
  };
}

async function sendNow() {
  const phone = process.env.OWNER_REPORT_PHONE;
  if (!phone || !FROM) return;
  const { calls, booked, confirms, reminders } = await fetchCounts();
  const text = `ChattyAI Daily:\nCalls: ${calls}\nBooked: ${booked}\nConfirms: ${confirms}\nReminders: ${reminders}`;
  await twilio.messages.create({ from: FROM, to: phone, body: text });
}

function nextRunUtc() {
  const tz = process.env.DAILY_REPORT_TZ || 'America/Los_Angeles';
  const hr = parseInt(process.env.DAILY_REPORT_HOUR || '7', 10);
  const now = DateTime.now().setZone(tz);
  let next = now.set({ hour: hr, minute: 0, second: 0, millisecond: 0 });
  if (next <= now) next = next.plus({ days: 1 });
  return next.toUTC();
}

module.exports = { sendNow, nextRunUtc };


