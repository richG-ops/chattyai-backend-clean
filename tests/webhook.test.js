const request = require('supertest');
const chai = require('chai');
const sinon = require('sinon');
const { expect } = chai;

describe('Vapi Webhook Tests', () => {
  let app;
  let sandbox;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Mock dependencies
    sandbox.stub(console, 'log');
    sandbox.stub(console, 'error');
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('POST /vapi-webhook', () => {
    it('should handle checkAvailability function', async () => {
      const payload = {
        function: 'checkAvailability',
        parameters: {
          date: 'tomorrow',
          timePreference: 'afternoon'
        },
        call: {
          id: 'call-123',
          phoneNumber: '+17025551234'
        }
      };
      
      const response = await request(app)
        .post('/vapi-webhook')
        .send(payload)
        .expect(200);
      
      expect(response.body).to.have.property('response');
      expect(response.body.response).to.include('availability');
      expect(response.body).to.have.property('slots');
    });
    
    it('should handle bookAppointment with all required fields', async () => {
      const payload = {
        function: 'bookAppointment',
        parameters: {
          customerName: 'John Doe',
          customerPhone: '+17025551234',
          customerEmail: 'john@example.com',
          serviceType: 'Haircut',
          date: '2024-01-20',
          time: '14:00'
        },
        call: {
          id: 'call-456',
          phoneNumber: '+17025551234'
        }
      };
      
      const response = await request(app)
        .post('/vapi-webhook')
        .send(payload)
        .expect(200);
      
      expect(response.body).to.have.property('response');
      expect(response.body.response).to.include('Perfect John Doe');
      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('bookingQueued', true);
    });
    
    it('should reject bookAppointment with missing required fields', async () => {
      const payload = {
        function: 'bookAppointment',
        parameters: {
          customerName: 'John Doe'
          // Missing phone, date, time
        }
      };
      
      const response = await request(app)
        .post('/vapi-webhook')
        .send(payload)
        .expect(200);
      
      expect(response.body).to.have.property('needsMoreInfo', true);
      expect(response.body.response).to.include('need a few more details');
    });
    
    it('should handle end-of-call webhook', async () => {
      const payload = {
        type: 'end-of-call',
        call: {
          id: 'call-789',
          startedAt: new Date(Date.now() - 300000), // 5 minutes ago
          endedAt: new Date(),
          phoneNumber: '+17025551234'
        },
        transcript: {
          text: 'Customer booked an appointment for tomorrow at 2pm',
          messages: [
            { role: 'assistant', content: 'How can I help you?' },
            { role: 'user', content: 'I need to book an appointment' }
          ]
        }
      };
      
      const response = await request(app)
        .post('/vapi-webhook')
        .send(payload)
        .expect(200);
      
      expect(response.body).to.have.property('success', true);
    });
    
    it('should handle unknown function gracefully', async () => {
      const payload = {
        function: 'unknownFunction',
        parameters: {}
      };
      
      const response = await request(app)
        .post('/vapi-webhook')
        .send(payload)
        .expect(200);
      
      expect(response.body).to.have.property('response');
      expect(response.body.response).to.include('I can help you');
    });
    
    it('should handle errors gracefully', async () => {
      const payload = null; // Invalid payload
      
      const response = await request(app)
        .post('/vapi-webhook')
        .send(payload)
        .expect(200);
      
      expect(response.body).to.have.property('error', true);
      expect(response.body.response).to.include('technical issue');
    });
    
    it('should enforce idempotency', async () => {
      const payload = {
        function: 'bookAppointment',
        parameters: {
          customerName: 'Test User',
          customerPhone: '+17025555555',
          date: 'tomorrow',
          time: '3pm'
        }
      };
      
      const requestId = 'unique-request-123';
      
      // First request
      const response1 = await request(app)
        .post('/vapi-webhook')
        .set('X-Request-ID', requestId)
        .send(payload)
        .expect(200);
      
      // Duplicate request with same ID
      const response2 = await request(app)
        .post('/vapi-webhook')
        .set('X-Request-ID', requestId)
        .send(payload)
        .expect(200);
      
      expect(response2.body).to.have.property('duplicate', true);
    });
  });
  
  describe('Lead Qualification', () => {
    it('should classify hot leads correctly', async () => {
      const payload = {
        function: 'qualifyLead',
        parameters: {
          name: 'Jane Smith',
          phone: '+17025556789',
          email: 'jane@company.com',
          company: 'ABC Corp',
          timeline: 'immediate',
          budget: '$5000-$10000',
          decisionMaker: 'yes',
          currentSolution: 'none',
          painPoints: ['slow response', 'missed calls', 'no automation']
        }
      };
      
      const response = await request(app)
        .post('/vapi-webhook')
        .send(payload)
        .expect(200);
      
      expect(response.body).to.have.property('leadQualified', true);
      expect(response.body).to.have.property('interestLevel', 'hot');
      expect(response.body.response).to.include('perfect fit');
    });
    
    it('should classify cold leads correctly', async () => {
      const payload = {
        function: 'qualifyLead',
        parameters: {
          name: 'Joe Looker',
          phone: '+17025550000',
          timeline: 'just_looking',
          budget: 'not_sure',
          decisionMaker: 'no'
        }
      };
      
      const response = await request(app)
        .post('/vapi-webhook')
        .send(payload)
        .expect(200);
      
      expect(response.body).to.have.property('interestLevel', 'cold');
    });
  });
  
  describe('Complaint Handling', () => {
    it('should escalate complaints immediately', async () => {
      const notificationStub = sandbox.stub(require('../lib/job-queue'), 'addNotificationJob');
      
      const payload = {
        function: 'handleComplaint',
        parameters: {
          complaint: 'The service was terrible and no one showed up'
        },
        call: {
          id: 'call-complaint',
          phoneNumber: '+17025559999'
        }
      };
      
      const response = await request(app)
        .post('/vapi-webhook')
        .send(payload)
        .expect(200);
      
      expect(response.body).to.have.property('escalated', true);
      expect(response.body.response).to.include('apologize');
      expect(response.body.response).to.include('30 minutes');
      
      // Verify urgent notification was sent
      expect(notificationStub.calledWith('sms', sinon.match({
        template: 'urgent_complaint'
      }))).to.be.true;
    });
  });
}); 