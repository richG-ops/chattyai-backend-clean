const axios = require('axios');

function getBaseURL() {
  return process.env.CALENDAR_API_URL || '';
}

function authHeaders() {
  const t = process.env.TENANT_JWT || process.env.CALENDAR_JWT || '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function getAvailability(params = {}) {
  const baseURL = getBaseURL();
  if (!baseURL) {
    const e = new Error('CALENDAR_BASE_URL_MISSING');
    e.code = 'CONFIG';
    throw e;
  }
  try {
    const res = await axios.get(`${baseURL}/get-availability`, {
      params, headers: authHeaders(), timeout: 10000,
    });
    return res.data;
  } catch (err) {
    const e = new Error('CALENDAR_UNAVAILABLE');
    e.code = 'UPSTREAM';
    e.cause = err;
    throw e;
  }
}

async function bookAppointment(payload = {}) {
  const baseURL = getBaseURL();
  if (!baseURL) {
    const e = new Error('CALENDAR_BASE_URL_MISSING');
    e.code = 'CONFIG';
    throw e;
  }
  const body = {
    startISO: payload.startISO || payload.startTime || payload.start,
    endISO: payload.endISO || payload.endTime || payload.end,
    title: payload.title || payload.summary,
    summary: payload.title || payload.summary,
    description: payload.description || '',
    customer: payload.customer || {},
    metadata: payload.metadata || {},
  };
  try {
    const res = await axios.post(`${baseURL}/book-appointment`, body, {
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      timeout: 10000,
    });
    return res.data;
  } catch (err) {
    const e = new Error('CALENDAR_UNAVAILABLE');
    e.code = 'UPSTREAM';
    e.cause = err;
    throw e;
  }
}

module.exports = { getAvailability, bookAppointment };


