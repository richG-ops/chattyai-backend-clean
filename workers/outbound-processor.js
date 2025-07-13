const Queue = require('bull');
const vapi = require('vapi-sdk'); // npm i vapi-sdk
const { getDb } = require('../db-config');
const outboundQueue = new Queue('outbound-calls', process.env.REDIS_URL, {
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
});

outboundQueue.process(async (job) => {
  const { phone, script, tenantId } = job.data;
  const vapiClient = new vapi.Client({ apiKey: process.env.VAPI_API_KEY });
  const db = getDb();
  try {
    const call = await vapiClient.outboundCalls.create({
      phoneNumber: phone,
      assistant: {
        model: 'gpt-4o',
        voice: 'alloy',
        firstMessage: script
      },
      metadata: { tenantId }
    });
    await db('calls').insert({
      call_id: call.id,
      type: 'outbound',
      status: 'initiated',
      tenant_id: tenantId,
      created_at: new Date()
    });
    return { success: true, callId: call.id };
  } catch (error) {
    console.error('Outbound error:', error);
    throw error;
  }
});

module.exports = outboundQueue; 