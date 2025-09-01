'use strict';

const Telnyx = require('telnyx');

function assertEnv(key) {
  if (!process.env[key]) throw new Error(`MISSING_ENV_${key}`);
}

async function sendSMS({ toE164, body }) {
  assertEnv('TELNYX_API_KEY');
  assertEnv('TELNYX_MESSAGING_PROFILE_ID');

  const client = Telnyx(process.env.TELNYX_API_KEY);

  const payload = {
    to: toE164,
    text: body,
    messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID,
  };
  if (process.env.TELNYX_FROM_NUMBER) payload.from = process.env.TELNYX_FROM_NUMBER;

  const { data } = await client.messages.create(payload);
  return {
    provider: 'telnyx',
    providerMessageId: data?.id || data?.data?.id,
    raw: data,
  };
}

module.exports = { sendSMS };


