const axios = require('axios');

// Environment
const API_BASE = process.env.CAL_API_BASE || 'https://api.cal.com';
const API_KEY = process.env.CAL_API_KEY;
const EVENT_ID = process.env.CAL_EVENT_TYPE_ID;
const TZ = process.env.TENANT_TZ || 'UTC';

// Cal.com v2 requires per-endpoint versions
const VERSIONS = { slots: '2024-09-04', bookings: '2024-08-13' };

function hasApiKey() {
  return !!API_KEY;
}

function getBaseURL() {
  return API_BASE;
}

function headersFor(version) {
  const authHeader = API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};
  return { 'Content-Type': 'application/json', ...authHeader, 'cal-api-version': version };
}

function toUtcISOString(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString();
}

function nowUtcISO() {
  return new Date().toISOString();
}

function plusDaysUtcISO(fromISO, days) {
  const d = new Date(fromISO);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function normalizeSlots(data) {
  // Attempt to find an array of slots with start/end
  let arr = [];
  if (Array.isArray(data)) arr = data;
  else if (Array.isArray(data?.data)) arr = data.data;
  else if (Array.isArray(data?.slots)) arr = data.slots;
  else if (Array.isArray(data?.timeSlots)) arr = data.timeSlots;
  else if (Array.isArray(data?.items)) arr = data.items;

  // Some Cal.com responses return an object keyed by date -> array of slots
  // e.g., { "2025-09-01": [{ start, end }, ...], ... }
  if (!arr.length && data && typeof data === 'object' && !Array.isArray(data)) {
    const values = Object.values(data).filter(Array.isArray);
    if (values.length) {
      arr = values.flat();
    }
  }

  return arr
    .map((s) => {
      const startISO = s.startISO || s.start || s.startTime || s.start_time || s.from;
      const endISO = s.endISO || s.end || s.endTime || s.end_time || s.to;
      if (!startISO) return null;
      return { startISO: toUtcISOString(startISO), endISO: endISO ? toUtcISOString(endISO) : undefined };
    })
    .filter(Boolean);
}

function buildError(endpoint, err) {
  // Preserve axios error when present so upstream mapping by status works.
  if (err && err.response && err.response.status) {
    err.provider = 'calcom';
    err.endpoint = endpoint;
    return err;
  }
  const e = new Error('calcom_request_failed');
  e.provider = 'calcom';
  e.endpoint = endpoint;
  e.status = err?.status || err?.code || 'error';
  // Create a faux response so upstream mappers can still use status
  e.response = e.response || { status: typeof e.status === 'number' ? e.status : 500 };
  return e;
}

async function health() {
  try {
    const res = await axios.get(`${API_BASE}/v2/users/me`, { headers: headersFor(VERSIONS.bookings), timeout: 8000 });
    return { ok: true, status: res.status, data: { user: res.data?.user || res.data || null } };
  } catch (err) {
    const e = buildError('GET /v2/users/me', err);
    return { ok: false, status: e.response?.status || 'error', error: 'provider_unreachable' };
  }
}

async function availability({ fromISO, toISO, durationMins } = {}) {
  if (!EVENT_ID) {
    const e = new Error('CAL_EVENT_TYPE_ID missing');
    e.code = 'CONFIG';
    throw e;
  }

  const start = toUtcISOString(fromISO || nowUtcISO());
  const end = toUtcISOString(toISO || plusDaysUtcISO(start, 14));

  const params = new URLSearchParams();
  params.set('eventTypeId', String(Number(EVENT_ID)));
  params.set('start', start);
  params.set('end', end);
  params.set('timeZone', TZ);
  params.set('format', 'range');
  // durationMins not strictly required when event type has fixed length

  const url = `${API_BASE}/v2/slots?${params.toString()}`;
  try {
    const res = await axios.get(url, { headers: headersFor(VERSIONS.slots), timeout: 12000 });
    const slots = normalizeSlots(res.data);
    return { slots };
  } catch (err) {
    throw buildError('GET /v2/slots', err);
  }
}

async function book({ startISO, name, email, phone } = {}) {
  if (!EVENT_ID) {
    const e = new Error('CAL_EVENT_TYPE_ID missing');
    e.code = 'CONFIG';
    throw e;
  }
  if (!startISO) {
    const e = new Error('startISO required');
    e.code = 'VALIDATION';
    throw e;
  }

  const body = {
    start: toUtcISOString(startISO),
    eventTypeId: Number(EVENT_ID),
    attendee: {
      name: name || 'Guest',
      email: email || 'guest@example.com',
      timeZone: TZ,
      phoneNumber: phone,
    },
  };

  try {
    const res = await axios.post(`${API_BASE}/v2/bookings`, body, { headers: headersFor(VERSIONS.bookings), timeout: 15000 });
    const d = res.data || {};
    const bookingId = d.bookingId || d.id || d.booking?.id || d.data?.id;
    const start = d.startISO || d.start || d.booking?.start || d.data?.start;
    const end = d.endISO || d.end || d.booking?.end || d.data?.end;
    return { ok: true, bookingId, startISO: start ? toUtcISOString(start) : undefined, endISO: end ? toUtcISOString(end) : undefined };
  } catch (err) {
    throw buildError('POST /v2/bookings', err);
  }
}

module.exports = {
  health,
  availability,
  book,
  getBaseURL,
  hasApiKey,
  VERSIONS,
};


