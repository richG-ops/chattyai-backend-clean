const express = require('express');
const router = express.Router();

router.post('/simulate-recording', express.json(), async (req, res) => {
  try {
    if (process.env.DEV_MODE !== 'true') {
      return res.status(404).json({ error: 'not_found' });
    }
    const { recordingUrl, callSid, from, to, duration } = req.body || {};
    const tenantId = process.env.DEFAULT_TENANT_ID;
    const { queues } = require('../lib/job-queue');
    const job = await queues.analytics.add('summarize_call', {
      callSid: callSid || 'CA_TEST',
      recordingSid: 'RE_TEST',
      recordingUrl: recordingUrl || 'https://example.com/sample.mp3',
      from: from || '+15551234567',
      to: to || '+15557654321',
      duration: duration || 10,
      tenantId
    }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    return res.status(200).json({ ok: true, jobId: job.id });
  } catch (err) {
    console.error('simulate-recording error:', err.message);
    return res.status(500).json({ error: 'internal' });
  }
});

module.exports = router;


