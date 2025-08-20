const axios = require('axios');

function getBaseURL() {
  return process.env.CALENDAR_API_URL || '';
}

function authHeaders() {
  const t = process.env.TENANT_JWT || process.env.CALENDAR_JWT || '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function hasJWT() {
  return !!(process.env.TENANT_JWT || process.env.CALENDAR_JWT);
}

function logOperation(op, url, status, hasJwt) {
  const maskedUrl = url ? `${url.split('/')[0]}//${url.split('/')[2]}/...` : 'none';
  console.log(`📅 Calendar ${op}: ${maskedUrl} | status: ${status} | JWT: ${hasJwt ? 'yes' : 'no'}`);
}

async function health() {
  const baseURL = getBaseURL();
  if (!baseURL) {
    return { ok: false, status: 'CALENDAR_API_URL_MISSING' };
  }
  
  try {
    const res = await axios.get(`${baseURL}/health`, {
      headers: authHeaders(),
      timeout: 5000,
    });
    const hasJwt = hasJWT();
    logOperation('health', baseURL, res.status, hasJwt);
    return { ok: true, status: res.status, data: res.data };
  } catch (err) {
    const hasJwt = hasJWT();
    const status = err.response?.status || 'error';
    logOperation('health', baseURL, status, hasJwt);
    return { ok: false, status: status, error: err.message };
  }
}

async function availability(params = {}) {
  const baseURL = getBaseURL();
  if (!baseURL) {
    const e = new Error('CALENDAR_BASE_URL_MISSING');
    e.code = 'CONFIG';
    throw e;
  }
  
  try {
    const res = await axios.get(`${baseURL}/get-availability`, {
      params, 
      headers: authHeaders(), 
      timeout: 10000,
    });
    const hasJwt = hasJWT();
    logOperation('availability', baseURL, res.status, hasJwt);
    return res.data;
  } catch (err) {
    const hasJwt = hasJWT();
    const status = err.response?.status || 'error';
    logOperation('availability', baseURL, status, hasJwt);
    
    // Map specific error codes
    if (err.response?.status === 401 || err.response?.status === 403) {
      const e = new Error('UPSTREAM_CALENDAR_401');
      e.code = 'UPSTREAM_CALENDAR_401';
      e.cause = err;
      throw e;
    }
    if (err.response?.status === 404) {
      const e = new Error('UPSTREAM_CALENDAR_404');
      e.code = 'UPSTREAM_CALENDAR_404';
      e.cause = err;
      throw e;
    }
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      const e = new Error('UPSTREAM_CALENDAR_UNREACHABLE');
      e.code = 'UPSTREAM_CALENDAR_UNREACHABLE';
      e.cause = err;
      throw e;
    }
    
    const e = new Error('UPSTREAM_CALENDAR_UNKNOWN');
    e.code = 'UPSTREAM_CALENDAR_UNKNOWN';
    e.cause = err;
    throw e;
  }
}

async function book(startISO, endISO = null, payload = {}) {
  const baseURL = getBaseURL();
  if (!baseURL) {
    const e = new Error('CALENDAR_BASE_URL_MISSING');
    e.code = 'CONFIG';
    throw e;
  }
  
  const body = {
    startISO: startISO || payload.startISO || payload.startTime || payload.start,
    endISO: endISO || payload.endISO || payload.endTime || payload.end,
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
    const hasJwt = hasJWT();
    logOperation('book', baseURL, res.status, hasJwt);
    return res.data;
  } catch (err) {
    const hasJwt = hasJWT();
    const status = err.response?.status || 'error';
    logOperation('book', baseURL, status, hasJwt);
    
    // Map specific error codes
    if (err.response?.status === 401 || err.response?.status === 403) {
      const e = new Error('UPSTREAM_CALENDAR_401');
      e.code = 'UPSTREAM_CALENDAR_401';
      e.cause = err;
      throw e;
    }
    if (err.response?.status === 404) {
      const e = new Error('UPSTREAM_CALENDAR_404');
      e.code = 'UPSTREAM_CALENDAR_404';
      e.cause = err;
      throw e;
    }
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      const e = new Error('UPSTREAM_CALENDAR_UNREACHABLE');
      e.code = 'UPSTREAM_CALENDAR_UNREACHABLE';
      e.cause = err;
      throw e;
    }
    
    const e = new Error('UPSTREAM_CALENDAR_UNKNOWN');
    e.code = 'UPSTREAM_CALENDAR_UNKNOWN';
    e.cause = err;
    throw e;
  }
}

// Legacy method names for backward compatibility
async function getAvailability(params = {}) {
  return availability(params);
}

async function bookAppointment(payload = {}) {
  return book(payload.startISO, payload.endISO, payload);
}

module.exports = { 
  health, 
  availability, 
  book, 
  getAvailability, 
  bookAppointment,
  hasJWT,
  getBaseURL 
};


