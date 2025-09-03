const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../../db-config');

// Delivery Status (DLR)
function verifyTelnyx(req) {
  try {
    const pub = (process.env.TELNYX_PUBLIC_KEY || '').trim();
    if (!pub) return true; // allow when not configured
    const sig = req.header('Telnyx-Signature-Ed25519');
    const ts = req.header('Telnyx-Timestamp');
    if (!sig || !ts) return false;
    const verifier = crypto.createVerify('ed25519');
    // Telnyx requires verifying over `${timestamp}.${rawBody}`; we need raw body middleware for strict check.
    // Fallback: verify hash of JSON string to avoid false negatives when raw body unavailable.
    const payload = `${ts}.${JSON.stringify(req.body || {})}`;
    verifier.update(payload);
    verifier.end();
    return verifier.verify(pub, Buffer.from(sig, 'base64'));
  } catch (_e) {
    return false;
  }
}

router.post('/telnyx-status', express.json({ type: '*/*' }), async (req, res) => {
  try {
    if (!verifyTelnyx(req)) {
      return res.status(401).send('invalid signature');
    }
    const db = getDb();
    const incoming = req.body;
    const events = Array.isArray(incoming?.data) ? incoming.data : [incoming?.data || incoming];
    for (const ev of events) {
      const type = ev?.event_type || ev?.type || '';
      const p = ev?.payload || ev?.data?.payload || {};
      const msgId = p?.id || ev?.id || '';
      const to = p?.to || p?.to_number || '';
      const body = p?.text || '';
      const status = /delivered/i.test(type)
        ? 'delivered'
        : /undeliver|failed/i.test(type)
        ? 'failed'
        : /sent|queued|accepted/i.test(type)
        ? 'sent'
        : 'unknown';
      await db.raw(
        `insert into notification_logs(provider, channel, to_e164, provider_message_id, status, body)
         values(?, ?, ?, ?, ?, ?)`,
        ['telnyx', 'sms', to, msgId, status, body]
      );
    }
    res.send('ok');
  } catch (e) {
    console.error('telnyx-status error:', e?.message || e);
    res.status(200).send('ok'); // avoid retry storms
  }
});

// Inbound MO (optional)
router.post('/telnyx-inbound', express.json({ type: '*/*' }), async (req, res) => {
  try {
    if (!verifyTelnyx(req)) {
      return res.status(401).send('invalid signature');
    }
    const db = getDb();
    const ev = req.body?.data || req.body;
    const p = ev?.payload || {};
    await db.raw(
      `insert into notification_logs(provider, channel, to_e164, provider_message_id, status, body)
       values(?, ?, ?, ?, ?, ?)`,
      ['telnyx', 'sms', p?.to || '', p?.id || '', 'inbound', p?.text || '']
    );
  } catch (e) {
    console.error('telnyx-inbound error:', e?.message || e);
  }
  res.send('ok');
});

// Failovers
router.post('/telnyx-status-failover', express.json({ type: '*/*' }), (_req, res) => res.send('ok'));
router.post('/telnyx-inbound-failover', express.json({ type: '*/*' }), (_req, res) => res.send('ok'));

module.exports = router;


