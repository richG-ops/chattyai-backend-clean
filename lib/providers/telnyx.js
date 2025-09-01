'use strict';

const axios = require('axios');

function need(key) {
  if (!process.env[key]) throw new Error(`MISSING_ENV_${key}`);
}

async function sendSMS({ toE164, body }) {
  need('TELNYX_API_KEY');
  need('TELNYX_MESSAGING_PROFILE_ID');

  const payload = {
    to: toE164,
    text: body,
    messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID,
  };
  if (process.env.TELNYX_FROM_NUMBER) payload.from = process.env.TELNYX_FROM_NUMBER;

  const { data } = await axios.post(
    'https://api.telnyx.com/v2/messages',
    payload,
    {
      headers: {
        Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );

  return { providerMessageId: data?.data?.id, raw: data };
}

module.exports = { sendSMS };


