const express = require('express');
const router = express.Router();

function requireDebugKey(req, res, next) {
  const debugKey = process.env.DEBUG_API_KEY;
  const providedKey = req.headers['x-debug-key'];
  if (!debugKey || providedKey !== debugKey) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }
  next();
}

router.use(requireDebugKey);

router.post('/debug/send-owner-report', async (req, res) => {
  try {
    await require('../lib/report/daily-owner').sendNow();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

module.exports = router;


