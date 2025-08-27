const express = require('express');
const router = express.Router();
const { newId } = require('../lib/id');
const { getDb } = require('../db-config');

function verifyTwilioSignature(req) {
	try {
		const twilio = require('twilio');
		const signature = req.headers['x-twilio-signature'];
		const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
		return twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN || '', signature, url, req.body || {});
	} catch (e) {
		console.warn('Twilio verify unavailable or invalid token:', e.message);
		return true; // don't block
	}
}

// Twilio posts urlencoded
router.post('/recording-callback', express.urlencoded({ extended: false }), async (req, res) => {
	const db = getDb();
	try {
		if (!verifyTwilioSignature(req)) {
			console.warn('Invalid Twilio signature for recording callback');
			return res.status(200).send('ok');
		}

		const {
			CallSid,
			RecordingSid,
			RecordingUrl,
			RecordingDuration,
			From,
			To,
		} = req.body || {};

		const tenantId = process.env.DEFAULT_TENANT_ID;

		// Upsert call by CallSid
		let call = await db('calls').where({ call_sid: CallSid }).first();
		if (!call) {
			await db('calls').insert({
				id: newId(),
				tenant_id: tenantId,
				call_sid: CallSid,
				from_number: From,
				to_number: To,
				started_at: new Date(),
			});
			call = await db('calls').where({ call_sid: CallSid }).first();
		}

		// Upsert recording by RecordingSid
		let rec = await db('call_recordings').where({ recording_sid: RecordingSid }).first();
		if (!rec) {
			await db('call_recordings').insert({
				id: newId(),
				call_id: call.id,
				recording_sid: RecordingSid,
				media_url: RecordingUrl,
				duration_seconds: RecordingDuration ? parseInt(RecordingDuration, 10) : null,
			});
		}

		// Enqueue summarize job (fire-and-forget)
		try {
			const { queues } = require('../lib/job-queue');
			await queues.analytics.add('summarize_call', {
				callSid: CallSid,
				recordingSid: RecordingSid,
				recordingUrl: RecordingUrl,
				from: From,
				to: To,
				tenantId,
			}, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
		} catch (qErr) {
			console.warn('Queue not available for summarize_call:', qErr.message);
		}

		return res.status(200).send('ok');
	} catch (err) {
		console.error('recording-callback error:', err.message);
		return res.status(200).send('ok');
	}
});

module.exports = router;


