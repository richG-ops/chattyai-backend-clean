const express = require('express');
const router = express.Router();
const { DateTime } = require('luxon');
const { getAvailability, bookAppointment } = require('../lib/calendarClient');
const { getDb } = require('../db-config');
const { availabilityQuery, bookBody } = require('../lib/validation');
const { sendEmail, emailEnabled } = require('../lib/email');

function ok(res, body) { return res.status(200).json(body); }
function bad(res, details) { return res.status(400).json({ code: 'VALIDATION', details }); }
function upstream(res, message) { return res.status(503).json({ code: 'UPSTREAM', message }); }
function internal(res) { return res.status(500).json({ code: 'INTERNAL' }); }

router.get('/availability', async (req, res) => {
	try {
		const parsed = availabilityQuery.safeParse(req.query || {});
		if (!parsed.success) return bad(res, parsed.error.flatten());
		const now = DateTime.utc();
		const fromISO = parsed.data.from || now.toISO();
		const toISO = parsed.data.to || now.plus({ days: 7 }).toISO();
		const resp = await getAvailability({ from: fromISO, to: toISO });
		const slots = Array.isArray(resp) ? resp : (resp.slots || []);
		return ok(res, { slots });
	} catch (err) {
		if (err?.code === 'CONFIG' || err?.code === 'UPSTREAM') return upstream(res, err.message);
		if (global.Sentry) global.Sentry.captureException(err, { tags: { route: 'availability' } });
		return internal(res);
	}
});

router.post('/book', express.json(), async (req, res) => {
	try {
		const parsed = bookBody.safeParse(req.body || {});
		if (!parsed.success) return bad(res, parsed.error.flatten());
		const { startISO, endISO, title, customer } = parsed.data;
		const end = endISO || DateTime.fromISO(startISO).plus({ minutes: 30 }).toISO();
		const result = await bookAppointment({ startISO, endISO: end, title, customer });
		const confirmationId = result.confirmationId || result.id || 'pending';

		// Optional email confirmations
		if (emailEnabled) {
			const when = DateTime.fromISO(result.startISO || startISO).toFormat('fff');
			const owner = process.env.OWNER_EMAIL;
			const toCustomer = customer?.email;
			const subj = `Appointment Confirmed`;
			const text = `Your appointment is confirmed for ${when}. Confirmation: ${confirmationId}`;
			const html = `<p>Your appointment is confirmed for <strong>${when}</strong>.<br/>Confirmation: <code>${confirmationId}</code></p>`;
			try {
				if (toCustomer) await sendEmail({ to: toCustomer, subject: subj, text, html });
				if (owner) await sendEmail({ to: owner, subject: `New Booking`, text: text, html });
			} catch (e) { /* best-effort */ }
		}

		return ok(res, { ok: true, confirmationId, startISO: result.startISO || startISO, endISO: end });
	} catch (err) {
		if (err?.code === 'CONFIG' || err?.code === 'UPSTREAM') return upstream(res, err.message);
		if (global.Sentry) global.Sentry.captureException(err, { tags: { route: 'book' } });
		return internal(res);
	}
});

module.exports = router;
// Additional listing endpoints
router.get('/calls', async (req, res) => {
    try {
        const db = getDb();
        const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
        const offset = parseInt(req.query.offset || '0', 10);
        const rows = await db('calls')
            .select(['id', 'call_sid', 'from_number', 'to_number', 'created_at'])
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset);
        return ok(res, { items: rows, nextOffset: offset + rows.length });
    } catch (err) {
        if (global.Sentry) global.Sentry.captureException(err, { tags: { route: 'list_calls' } });
        return internal(res);
    }
});

router.get('/call-summaries', async (req, res) => {
    try {
        const db = getDb();
        const limit = Math.min(parseInt(req.query.limit || '1', 10), 100);
        const callSid = req.query.callSid;
        const callId = req.query.callId;
        let query = db('call_summaries')
            .select(['call_summaries.id', 'call_summaries.summary as gist', 'call_summaries.sentiment', 'call_summaries.classification', 'call_summaries.created_at']);
        if (callId) {
            query = query.where('call_id', callId);
        } else if (callSid) {
            query = query.join('calls', 'calls.id', 'call_summaries.call_id').where('calls.call_sid', callSid);
        }
        const rows = await query.orderBy('call_summaries.created_at', 'desc').limit(limit);
        const items = rows.map(r => ({ id: r.id, gist: r.gist, intent: (r.classification && typeof r.classification === 'object') ? (r.classification.intent || null) : null, tags: r.classification || {}, created_at: r.created_at }));
        return ok(res, { items, nextOffset: null });
    } catch (err) {
        if (global.Sentry) global.Sentry.captureException(err, { tags: { route: 'list_call_summaries' } });
        return internal(res);
    }
});

router.get('/followups', async (req, res) => {
    try {
        const db = getDb();
        const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
        const offset = parseInt(req.query.offset || '0', 10);
        const rows = await db('followups')
            .select(['id', 'when_at', 'contact_name', 'contact_phone', 'contact_email', 'created_event_id'])
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset);
        return ok(res, { items: rows, nextOffset: offset + rows.length });
    } catch (err) {
        if (global.Sentry) global.Sentry.captureException(err, { tags: { route: 'list_followups' } });
        return internal(res);
    }
});


