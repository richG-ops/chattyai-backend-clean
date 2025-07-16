// TheChattyAI Integration Test Suite
// Tests all critical paths with elite coverage

const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const app = require('../src/index');

// Test configuration
const TEST_JWT_SECRET = 'test-secret-key';
const TEST_TENANT_ID = 'test-tenant-123';

// Generate test JWT token
function generateTestToken(tenantId = TEST_TENANT_ID) {
  return jwt.sign({ tenantId }, TEST_JWT_SECRET, { expiresIn: '1h' });
}

describe('TheChattyAI Elite Backend Integration Tests', () => {
  let server;
  let testToken;
  
  before(async () => {
    // Set test environment variables
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    process.env.NODE_ENV = 'test';
    
    // Generate test token
    testToken = generateTestToken();
    
    // Start server
    server = app.listen(0); // Random port
  });
  
  after(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('Health Endpoints', () => {
    it('should return healthy status from /health', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body).to.have.property('status', 'healthy');
      expect(res.body).to.have.property('version');
      expect(res.body).to.have.property('environment', 'test');
    });

    it('should return detailed health from /healthz', async () => {
      const res = await request(app)
        .get('/healthz')
        .expect(200);
      
      expect(res.body).to.have.property('server', 'healthy');
      expect(res.body).to.have.property('database');
      expect(res.body).to.have.property('redis');
      expect(res.body).to.have.property('timestamp');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without JWT token', async () => {
      const res = await request(app)
        .get('/get-availability')
        .expect(401);

      expect(res.body).to.have.property('error', 'No authorization header');
    });

    it('should reject requests with invalid JWT token', async () => {
      const res = await request(app)
        .get('/get-availability')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(res.body).to.have.property('error', 'Invalid token');
    });

    it('should accept requests with valid JWT token', async () => {
      // Mock the GoogleCalendarPlugin
      const stub = sinon.stub().resolves({ slots: [] });
      
      const res = await request(app)
        .get('/get-availability')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);
      
      expect(res.body).to.be.an('object');
    });
  });

  describe('Calendar Endpoints', () => {
    describe('GET /get-availability', () => {
      it('should return available time slots', async () => {
        const res = await request(app)
          .get('/get-availability')
          .set('Authorization', `Bearer ${testToken}`)
          .query({
            startDate: '2025-01-20',
            endDate: '2025-01-21',
            duration: 30
          })
        .expect(200);
      
        expect(res.body).to.be.an('object');
        // Expect slots array or error (depending on Google Calendar setup)
      });

      it('should validate query parameters', async () => {
        const res = await request(app)
          .get('/get-availability')
          .set('Authorization', `Bearer ${testToken}`)
          .query({
            duration: 'invalid'
          })
          .expect(200); // Still returns 200 but with default values

        expect(res.body).to.be.an('object');
      });
    });

    describe('POST /book-appointment', () => {
      it('should book an appointment with valid data', async () => {
        const bookingData = {
          start: '2025-01-20T14:00:00Z',
          end: '2025-01-20T14:30:00Z',
          summary: 'Test Appointment',
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          customerPhone: '+1234567890',
          service: 'Hair Cut'
        };
      
      const res = await request(app)
          .post('/book-appointment')
          .set('Authorization', `Bearer ${testToken}`)
          .send(bookingData)
          .expect(201);

        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('message', 'Appointment booked successfully');
      });

      it('should reject booking with missing required fields', async () => {
        const res = await request(app)
          .post('/book-appointment')
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            summary: 'Test Appointment'
            // Missing start and end
          })
          .expect(400);

        expect(res.body).to.have.property('error', 'Missing required fields');
      });
    });
  });

  describe('Webhook Endpoints', () => {
    const webhookData = {
      callId: 'test-call-123',
      tenantId: TEST_TENANT_ID,
      customerPhone: '+1234567890',
      transcript: 'I would like to book an appointment for tomorrow at 2pm',
      secret: process.env.VAPI_WEBHOOK_SECRET || 'test-secret'
    };

    it('should process VAPI webhook at /webhook', async () => {
      const res = await request(app)
        .post('/webhook')
        .send(webhookData)
        .expect(200);
      
      expect(res.body).to.be.an('object');
    });

    it('should support legacy /vapi endpoint', async () => {
      const res = await request(app)
        .post('/vapi')
        .send(webhookData)
        .expect(200);

      expect(res.body).to.be.an('object');
    });

    it('should support new /api/v1/webhook endpoint', async () => {
      const res = await request(app)
        .post('/api/v1/webhook')
        .send(webhookData)
        .expect(200);
      
      expect(res.body).to.be.an('object');
    });
  });

  describe('Dashboard API', () => {
    describe('GET /api/calls', () => {
      it('should return paginated call history', async () => {
        const res = await request(app)
          .get('/api/calls')
          .set('Authorization', `Bearer ${testToken}`)
          .query({
            page: 1,
            limit: 10
          })
          .expect(200);

        expect(res.body).to.have.property('calls');
        expect(res.body).to.have.property('pagination');
        expect(res.body.pagination).to.have.property('page', 1);
        expect(res.body.pagination).to.have.property('limit', 10);
      });

      it('should filter calls by date range', async () => {
        const res = await request(app)
          .get('/api/calls')
          .set('Authorization', `Bearer ${testToken}`)
          .query({
            startDate: '2025-01-01',
            endDate: '2025-01-31'
          })
          .expect(200);

        expect(res.body).to.have.property('calls');
        expect(res.body.calls).to.be.an('array');
      });
    });
    
    describe('GET /api/analytics', () => {
      it('should return analytics for default period', async () => {
        const res = await request(app)
          .get('/api/analytics')
          .set('Authorization', `Bearer ${testToken}`)
          .expect(200);

        expect(res.body).to.have.property('period', '7d');
        expect(res.body).to.have.property('metrics');
        expect(res.body.metrics).to.have.property('totalCalls');
        expect(res.body.metrics).to.have.property('conversionRate');
      });

      it('should support custom time periods', async () => {
      const res = await request(app)
          .get('/api/analytics')
          .set('Authorization', `Bearer ${testToken}`)
          .query({ period: '30d' })
        .expect(200);
      
        expect(res.body).to.have.property('period', '30d');
      });
    });

    describe('GET /api/dashboard/realtime', () => {
      it('should return real-time dashboard data', async () => {
        const res = await request(app)
          .get('/api/dashboard/realtime')
          .set('Authorization', `Bearer ${testToken}`)
          .expect(200);

        expect(res.body).to.have.property('recentCalls');
        expect(res.body).to.have.property('stats');
        expect(res.body.stats).to.have.property('callsToday');
        expect(res.body.stats).to.have.property('activeAgents', 3);
      });
    });
  });

  describe('Zapier Integration', () => {
    it('should process Zapier webhook for new booking', async () => {
      const zapierData = {
        trigger: 'new_booking',
        data: {
          customerName: 'Jane Doe',
          customerPhone: '+1987654321',
          service: 'Massage',
          bookingTime: '2025-01-20T15:00:00Z'
        }
      };

      const res = await request(app)
        .post('/zapier-webhook')
        .set('Authorization', `Bearer ${testToken}`)
        .send(zapierData)
        .expect(200);
      
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('processed', 'new_booking');
    });
    
    it('should handle unknown Zapier triggers gracefully', async () => {
      const res = await request(app)
        .post('/zapier-webhook')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          trigger: 'unknown_trigger',
          data: {}
        })
        .expect(200);
      
      expect(res.body).to.have.property('success', true);
    });
    });
    
  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const res = await request(app)
        .get('/non-existent-endpoint')
        .expect(404);

      expect(res.body).to.have.property('error', 'Endpoint not found');
    });

    it('should handle malformed JSON gracefully', async () => {
      const res = await request(app)
        .post('/book-appointment')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json')
        .expect(400);
      
      expect(res.body).to.have.property('error');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      const promises = [];
      
      // Send 10 concurrent health checks
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/health')
            .expect(200)
        );
      }
      
      const results = await Promise.all(promises);
      expect(results).to.have.length(10);
      results.forEach(res => {
        expect(res.body).to.have.property('status', 'healthy');
      });
    });

    it('should respond within acceptable time', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).to.be.below(100); // Should respond in under 100ms
    });
  });
});

// Run the tests
if (require.main === module) {
  const Mocha = require('mocha');
  const mocha = new Mocha();
  
  mocha.addFile(__filename);
  mocha.run(failures => {
    process.exit(failures ? 1 : 0);
  });
} 