// tests/test-vapi-now.js
const axios = require('axios');
const { getDb } = require('../db-config');

(async () => {
  const db = getDb();
  console.log('--- E2E Test: Vapi Inbound → Booking → Notification → Outbound → Real-Time ---');

  // 1. Simulate inbound Vapi webhook
  const testCallId = 'test-call-' + Date.now();
  const testTenantId = 'test-tenant-1';
  const testPhone = '+15555550123';
  const testEmail = 'testuser@example.com';
  const testName = 'Test User';
  const testTranscript = {
    text: `My name is ${testName}, my phone is ${testPhone}, my email is ${testEmail}, I want to book a haircut tomorrow at 2pm.`,
    messages: [
      { role: 'assistant', text: 'What is your name?' },
      { role: 'user', text: testName },
      { role: 'assistant', text: 'What is your phone number?' },
      { role: 'user', text: testPhone },
      { role: 'assistant', text: 'What is your email?' },
      { role: 'user', text: testEmail },
      { role: 'assistant', text: 'What service and time?' },
      { role: 'user', text: 'Haircut tomorrow at 2pm' }
    ]
  };
  const webhookRes = await axios.post('http://localhost:4000/api/vapi/webhook', {
    type: 'end-of-call',
    call: { id: testCallId, phoneNumber: testPhone, assistantId: testTenantId },
    transcript: testTranscript,
    tenantId: testTenantId
  });
  console.log('Webhook response:', webhookRes.data);

  // 2. Check DB for call, booking, customer
  const call = await db('calls').where('call_id', testCallId).first();
  const customer = await db('customers').where('phone', testPhone).first();
  const booking = await db('bookings').where('customer_id', customer?.id).first();
  console.log('Call:', !!call, 'Customer:', !!customer, 'Booking:', !!booking);

  // 3. Check notification log
  const notif = await db('notification_logs').where('recipient', testPhone).orderBy('created_at', 'desc').first();
  console.log('Notification sent:', !!notif, notif?.status);

  // 4. Check outbound follow-up (should be queued if booking not confirmed)
  const outbound = await db('calls').where('type', 'outbound').andWhere('phone_number', testPhone).orderBy('created_at', 'desc').first();
  console.log('Outbound follow-up queued:', !!outbound);

  // 5. (Optional) Check real-time event emission (manual/console)
  console.log('Check dashboard for real-time update (manual).');

  // 6. Cleanup (optional)
  // await db('bookings').where('customer_id', customer?.id).del();
  // await db('customers').where('id', customer?.id).del();
  // await db('calls').where('call_id', testCallId).del();

  console.log('--- E2E Test Complete ---');
  process.exit(0);
})(); 