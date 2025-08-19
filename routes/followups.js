const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { getDb } = require('../db-config');
const { newId } = require('../lib/id');
const { bookAppointment } = require('../lib/calendarClient');

const bodySchema = z.object({
	whenISO: z.string(),
	title: z.string().optional(),
	contact: z.object({
		name: z.string().optional(),
		phone: z.string().optional(),
		email: z.string().optional(),
	}).optional(),
	callId: z.string().uuid().optional(),
});

router.post('/', express.json(), async (req, res) => {
	const db = getDb();
	try {
		const parse = bodySchema.safeParse(req.body || {});
		if (!parse.success) {
			return res.status(400).json({ ok: false, error: 'invalid_body' });
		}
		const { whenISO, title, contact, callId } = parse.data;
		const tenantId = process.env.DEFAULT_TENANT_ID;

		const id = newId();
		await db('followups').insert({
			id,
			tenant_id: tenantId,
			call_id: callId || null,
			when_at: new Date(whenISO),
			title: title || 'Follow-up call',
			contact_name: contact?.name || null,
			contact_phone: contact?.phone || null,
			contact_email: contact?.email || null,
		});

		// Create calendar hold
		let eventId = null;
		try {
			const endISO = new Date(new Date(whenISO).getTime() + 30 * 60000).toISOString();
			const resp = await bookAppointment({
				startISO: whenISO,
				endISO,
				title: title || 'Follow-up call',
				description: contact?.name ? `Follow-up with ${contact.name}` : 'Follow-up',
				customer: { name: contact?.name, phone: contact?.phone, email: contact?.email },
			});
			eventId = resp?.confirmationId || resp?.id || null;
			await db('followups').where({ id }).update({ created_event_id: eventId });
		} catch (calErr) {
			console.warn('Calendar create failed for follow-up:', calErr.message);
		}

		return res.status(200).json({ ok: true, id, eventId });
	} catch (err) {
		console.error('followups error:', err.message);
		if (global.Sentry) global.Sentry.captureException(err, { tags: { route: 'followups' } });
		return res.status(200).json({ ok: false, error: 'internal' });
	}
});

module.exports = router;


