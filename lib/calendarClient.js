const axios = require('axios');

const baseURL = process.env.CALENDAR_API_URL;
if (!baseURL) throw new Error('CALENDAR_API_URL is required');

function authHeaders() {
	const token = process.env.TENANT_JWT || process.env.CALENDAR_JWT || '';
	return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getAvailability(params = {}) {
	const res = await axios.get(`${baseURL}/get-availability`, {
		params,
		headers: authHeaders(),
		timeout: 10000,
	});
	return res.data; // expect { slots: [...] } or array
}

async function bookAppointment(payload) {
	// Ship superset keys so calendar-bot accepts any variant
	const body = {
		startISO: payload.startISO || payload.startTime || payload.start,
		endISO: payload.endISO || payload.endTime || payload.end,
		startTime: payload.startISO || payload.startTime || payload.start,
		endTime: payload.endISO || payload.endTime || payload.end,
		title: payload.title || payload.summary,
		summary: payload.title || payload.summary,
		description: payload.description || '',
		customer: payload.customer || {},
		metadata: payload.metadata || {},
	};
	const res = await axios.post(`${baseURL}/book-appointment`, body, {
		headers: { 'Content-Type': 'application/json', ...authHeaders() },
		timeout: 10000,
	});
	return res.data; // expect { confirmationId, startISO, ... }
}

module.exports = { getAvailability, bookAppointment };


