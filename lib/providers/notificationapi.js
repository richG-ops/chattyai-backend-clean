'use strict';

let notificationapi = null;
let initialized = false;

function init() {
  const appId = process.env.NOTIFICATIONAPI_APP_ID;
  const secret = process.env.NOTIFICATIONAPI_SECRET;

  if (!appId || !secret) {
    console.warn('NotificationAPI disabled (missing NOTIFICATIONAPI_APP_ID/SECRET)');
    initialized = false;
    return false;
  }

  try {
    const raw = require('notificationapi-node-server-sdk');
    notificationapi = raw?.default || raw;
    notificationapi.init(appId, secret);
    initialized = true;
    console.log('NotificationAPI initialized');
  } catch (err) {
    initialized = false;
    console.error('NotificationAPI init failed:', err?.message || err);
  }

  return initialized;
}

async function sendSMS({ number, email, type, data }) {
  if (!initialized) throw new Error('NotificationAPI not configured');
  const to = { id: email || number, email, number };
  const payload = {
    type: type || process.env.NOTIFICATIONAPI_SMS_TYPE || 'chattyai_',
    to,
    data
  };
  const res = await notificationapi.send(payload);
  return {
    provider: 'notificationapi',
    id: res?.data?.id || res?.data?.requestId,
    raw: res?.data
  };
}

module.exports = {
  init,
  isReady: () => initialized,
  sendSMS
};


