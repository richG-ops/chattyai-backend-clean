// ============================================================================
// COMPREHENSIVE INTEGRATION TESTS
// ============================================================================
// Author: Elite Implementation Team
// Purpose: Full system validation including webhooks, notifications, and APIs
// Coverage: End-to-end flows, error cases, load testing
// ============================================================================

const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const app = require('../index');
const { getDb } = require('../db-config');
const notificationService = require('../lib/notification-service');

// Test data
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const TEST_CALL_ID = 'test-call-123';
const TEST_WEBHOOK_SECRET = 'test-secret-key';

// Mock webhook payload
const createWebhookPayload = (overrides = {}) => ({
  type: 'end-of-call-report',
  call: {
    id: TEST_CALL_ID,
    phoneNumber: '+14155551234',
    startedAt: new Date(Date.now() - 300000).toISOString(), // 5 min ago
    endedAt: new Date().toISOString(),
    direction: 'inbound',
    assistantId: TEST_TENANT_ID,
    messages: [
      {
        type: 'function_call',
        function: {
          name: 'bookAppointment',
          parameters: {
            customerName: 'John Doe',
            customerPhone: '+14155551234',
            customerEmail: 'john@example.com',
            serviceType: 'Consultation',
            date: '2024-12-25',
            time: '14:00'
          }
        }
      }
    ]
  },
  transcript: 'Customer booked appointment successfully',
  ...overrides
});

// Generate HMAC signature for webhook
function generateWebhookSignature(payload, secret = TEST_WEBHOOK_SECRET) {
  const crypto = require('crypto');
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(timestamp + '.' + payloadStr)
    .digest('hex');
  
  return { signature, timestamp };
}

describe('🧪 ChattyAI Integration Tests', () => {
  let db;
  let notificationStub;
  
  before(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.VAPI_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    process.env.DEFAULT_TENANT_ID = TEST_TENANT_ID;
    
    // Get database connection
    db = getDb();
    
    // Clean test data
    await db('calls').where('call_id', 'like', 'test-%').del();
    await db('bookings').where('booking_id', 'like', 'test-%').del();
    await db('processed_webhooks').where('request_id', 'like', 'test-%').del();
  });
  
  beforeEach(() => {
    // Stub notifications to prevent actual sending
    notificationStub = {
      sendSMS: sinon.stub(notificationService, 'sendSMS').resolves({ sid: 'mock-sms' }),
      sendEmail: sinon.stub(notificationService, 'sendEmail').resolves({ statusCode: 202 }),
      sendDualNotifications: sinon.stub(notificationService, 'sendDualNotifications').resolves({
        customer: { sms: true, email: true },
        owner: { sms: true, email: true }
      })
    };
  });
  
  afterEach(() => {
    // Restore stubs
    Object.values(notificationStub).forEach(stub => stub.restore());
  });
  
  after(async () => {
    // Clean up test data
    await db('calls').where('call_id', 'like', 'test-%').del();
    await db('bookings').where('booking_id', 'like', 'test-%').del();
    await db('processed_webhooks').where('request_id', 'like', 'test-%').del();
  });

  // ============================================================================
  // HEALTH CHECK TESTS
  // ============================================================================
  
  describe('📋 Health Checks', () => {
    it('should return healthy status', async () => {
      const res = await request(app)
        .get('/healthz')
        .expect(200);
      
      expect(res.body).to.have.property('status', 'ok');
      expect(res.body).to.have.property('timestamp');
      expect(res.body).to.have.property('database', true);
    });
  });

  // ============================================================================
  // WEBHOOK TESTS
  // ============================================================================
  
  describe('🔌 Webhook Handler', () => {
    it('should process valid webhook with signature', async () => {
      const payload = createWebhookPayload();
      const { signature, timestamp } = generateWebhookSignature(payload);
      
      const res = await request(app)
        .post('/api/v1/webhook')
        .set('x-vapi-signature', signature)
        .set('x-vapi-timestamp', timestamp.toString())
        .set('x-vapi-request-id', 'test-request-001')
        .send(payload)
        .expect(200);
      
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('call_id', TEST_CALL_ID);
      
      // Verify call was stored
      const storedCall = await db('calls').where('call_id', TEST_CALL_ID).first();
      expect(storedCall).to.exist;
      expect(storedCall.outcome).to.equal('booked');
      expect(storedCall.duration_seconds).to.be.greaterThan(0);
    });
    
    it('should reject webhook with invalid signature', async () => {
      const payload = createWebhookPayload();
      
      await request(app)
        .post('/api/v1/webhook')
        .set('x-vapi-signature', 'invalid-signature')
        .set('x-vapi-timestamp', Date.now().toString())
        .send(payload)
        .expect(401);
    });
    
    it('should handle idempotent requests', async () => {
      const payload = createWebhookPayload({ call: { id: 'test-idempotent-123' } });
      const { signature, timestamp } = generateWebhookSignature(payload);
      const requestId = 'test-idempotent-request';
      
      // First request
      const res1 = await request(app)
        .post('/api/v1/webhook')
        .set('x-vapi-signature', signature)
        .set('x-vapi-timestamp', timestamp.toString())
        .set('x-vapi-request-id', requestId)
        .send(payload)
        .expect(200);
      
      // Duplicate request
      const res2 = await request(app)
        .post('/api/v1/webhook')
        .set('x-vapi-signature', signature)
        .set('x-vapi-timestamp', timestamp.toString())
        .set('x-vapi-request-id', requestId)
        .send(payload)
        .expect(200);
      
      expect(res2.body).to.deep.equal(res1.body);
      
      // Verify only one call was stored
      const callCount = await db('calls')
        .where('call_id', 'test-idempotent-123')
        .count('* as count')
        .first();
      expect(parseInt(callCount.count)).to.equal(1);
    });
    
    it('should handle function calls', async () => {
      const payload = {
        type: 'function-call',
        function: 'checkAvailability',
        parameters: { date: '2024-12-25' }
      };
      const { signature, timestamp } = generateWebhookSignature(payload);
      
      const res = await request(app)
        .post('/api/v1/webhook')
        .set('x-vapi-signature', signature)
        .set('x-vapi-timestamp', timestamp.toString())
        .send(payload)
        .expect(200);
      
      expect(res.body).to.have.property('response');
      expect(res.body.response).to.include('availability');
    });
  });

  // ============================================================================
  // NOTIFICATION TESTS
  // ============================================================================
  
  describe('📱 Notifications', () => {
    it('should send dual notifications for bookings', async () => {
      const payload = createWebhookPayload();
      const { signature, timestamp } = generateWebhookSignature(payload);
      
      await request(app)
        .post('/api/v1/webhook')
        .set('x-vapi-signature', signature)
        .set('x-vapi-timestamp', timestamp.toString())
        .send(payload)
        .expect(200);
      
      // Verify notifications were attempted
      expect(notificationStub.sendDualNotifications.calledOnce).to.be.true;
      
      const notificationCall = notificationStub.sendDualNotifications.firstCall;
      const bookingData = notificationCall.args[0];
      
      expect(bookingData).to.have.property('customerName', 'John Doe');
      expect(bookingData).to.have.property('customerPhone');
      expect(bookingData).to.have.property('customerEmail', 'john@example.com');
    });
    
    it('should handle notification failures gracefully', async () => {
      // Make notifications fail
      notificationStub.sendDualNotifications.rejects(new Error('Network error'));
      
      const payload = createWebhookPayload();
      const { signature, timestamp } = generateWebhookSignature(payload);
      
      // Should still succeed even if notifications fail
      const res = await request(app)
        .post('/api/v1/webhook')
        .set('x-vapi-signature', signature)
        .set('x-vapi-timestamp', timestamp.toString())
        .send(payload)
        .expect(200);
      
      expect(res.body).to.have.property('success', true);
    });
  });

  // ============================================================================
  // DASHBOARD API TESTS
  // ============================================================================
  
  describe('📊 Dashboard APIs', () => {
    before(async () => {
      // Insert test data
      await db('calls').insert({
        call_id: 'test-dashboard-001',
        tenant_id: TEST_TENANT_ID,
        phone_number: '+14155551111',
        caller_phone: '+14155551111',
        started_at: new Date(Date.now() - 3600000),
        ended_at: new Date(Date.now() - 3300000),
        duration_seconds: 300,
        outcome: 'booked',
        status: 'confirmed',
        created_at: new Date(Date.now() - 3600000)
      });
    });
    
    it('should fetch paginated calls', async () => {
      const res = await request(app)
        .get('/api/calls')
        .query({ tenant_id: TEST_TENANT_ID, page: 1, limit: 10 })
        .expect(200);
      
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data').that.is.an('array');
      expect(res.body).to.have.property('pagination');
      expect(res.body.pagination).to.have.property('total');
      expect(res.body.pagination).to.have.property('page', 1);
    });
    
    it('should fetch single call details', async () => {
      const res = await request(app)
        .get('/api/calls/test-dashboard-001')
        .expect(200);
      
      expect(res.body).to.have.property('success', true);
      expect(res.body.data).to.have.property('call_id', 'test-dashboard-001');
      expect(res.body.data).to.have.property('summary');
    });
    
    it('should fetch analytics', async () => {
      const res = await request(app)
        .get('/api/analytics')
        .query({ tenant_id: TEST_TENANT_ID, period: '7d' })
        .expect(200);
      
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('overview');
      expect(res.body.overview).to.have.property('total_calls');
      expect(res.body.overview).to.have.property('conversion_rate');
      expect(res.body).to.have.property('daily_breakdown').that.is.an('array');
    });
    
    it('should export calls as CSV', async () => {
      const res = await request(app)
        .get('/api/export/calls')
        .query({ tenant_id: TEST_TENANT_ID })
        .expect(200);
      
      expect(res.headers['content-type']).to.include('text/csv');
      expect(res.headers['content-disposition']).to.include('attachment');
      expect(res.text).to.include('Call ID,Date,Phone');
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================
  
  describe('❌ Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Temporarily break DB connection
      const originalDb = db.raw;
      db.raw = () => Promise.reject(new Error('Database connection lost'));
      
      const res = await request(app)
        .get('/api/calls')
        .expect(500);
      
      expect(res.body).to.have.property('error');
      
      // Restore DB
      db.raw = originalDb;
    });
    
    it('should handle malformed webhook payloads', async () => {
      const { signature, timestamp } = generateWebhookSignature({});
      
      await request(app)
        .post('/api/v1/webhook')
        .set('x-vapi-signature', signature)
        .set('x-vapi-timestamp', timestamp.toString())
        .send({}) // Empty payload
        .expect(200); // Should still return 200 but handle gracefully
    });
  });

  // ============================================================================
  // LOAD TESTS
  // ============================================================================
  
  describe('⚡ Load Testing', () => {
    it('should handle concurrent webhook requests', async function() {
      this.timeout(10000); // 10 second timeout
      
      const promises = [];
      const concurrentRequests = 50;
      
      for (let i = 0; i < concurrentRequests; i++) {
        const payload = createWebhookPayload({
          call: { id: `test-load-${i}` }
        });
        const { signature, timestamp } = generateWebhookSignature(payload);
        
        const promise = request(app)
          .post('/api/v1/webhook')
          .set('x-vapi-signature', signature)
          .set('x-vapi-timestamp', timestamp.toString())
          .set('x-vapi-request-id', `test-load-request-${i}`)
          .send(payload);
        
        promises.push(promise);
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(res => {
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('success', true);
      });
      
      // Verify all calls were stored
      const storedCalls = await db('calls')
        .where('call_id', 'like', 'test-load-%')
        .count('* as count')
        .first();
      
      expect(parseInt(storedCalls.count)).to.equal(concurrentRequests);
    });
    
    it('should handle rapid API requests', async function() {
      this.timeout(5000);
      
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app).get('/api/calls').query({ tenant_id: TEST_TENANT_ID })
        );
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(res => {
        expect(res.status).to.equal(200);
      });
    });
  });

  // ============================================================================
  // END-TO-END FLOWS
  // ============================================================================
  
  describe('🔄 End-to-End Flows', () => {
    it('should complete full booking flow', async () => {
      // 1. Function call to check availability
      const checkPayload = {
        type: 'function-call',
        function: 'checkAvailability',
        parameters: { date: '2024-12-26' }
      };
      let { signature, timestamp } = generateWebhookSignature(checkPayload);
      
      const checkRes = await request(app)
        .post('/api/v1/webhook')
        .set('x-vapi-signature', signature)
        .set('x-vapi-timestamp', timestamp.toString())
        .send(checkPayload)
        .expect(200);
      
      expect(checkRes.body.response).to.include('availability');
      
      // 2. Book appointment
      const bookPayload = {
        type: 'function-call',
        function: 'bookAppointment',
        parameters: {
          customerName: 'Jane Smith',
          customerPhone: '+14155552222',
          customerEmail: 'jane@example.com',
          serviceType: 'Haircut',
          date: '2024-12-26',
          time: '10:00'
        },
        call: { id: 'test-e2e-booking' }
      };
      ({ signature, timestamp } = generateWebhookSignature(bookPayload));
      
      const bookRes = await request(app)
        .post('/api/v1/webhook')
        .set('x-vapi-signature', signature)
        .set('x-vapi-timestamp', timestamp.toString())
        .send(bookPayload)
        .expect(200);
      
      expect(bookRes.body.response).to.include('booked');
      
      // 3. End call
      const endPayload = createWebhookPayload({
        call: { 
          id: 'test-e2e-booking',
          messages: bookPayload.parameters
        }
      });
      ({ signature, timestamp } = generateWebhookSignature(endPayload));
      
      await request(app)
        .post('/api/v1/webhook')
        .set('x-vapi-signature', signature)
        .set('x-vapi-timestamp', timestamp.toString())
        .send(endPayload)
        .expect(200);
      
      // 4. Verify data in dashboard
      const callsRes = await request(app)
        .get('/api/calls')
        .query({ tenant_id: TEST_TENANT_ID })
        .expect(200);
      
      const e2eCall = callsRes.body.data.find(c => c.call_id === 'test-e2e-booking');
      expect(e2eCall).to.exist;
      expect(e2eCall.outcome).to.equal('booked');
      
      // 5. Verify booking was created
      const booking = await db('bookings')
        .where('call_id', 'test-e2e-booking')
        .first();
      
      expect(booking).to.exist;
      expect(booking.customer_name).to.equal('Jane Smith');
      expect(booking.service_type).to.equal('Haircut');
    });
  });
});

// Export for use in other test files
module.exports = {
  createWebhookPayload,
  generateWebhookSignature
}; 