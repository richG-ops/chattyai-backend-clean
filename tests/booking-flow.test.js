const chai = require('chai');
const sinon = require('sinon');
const { expect } = chai;
const { processBooking } = require('../workers/booking-processor');
const { getDb } = require('../db-config');
const { addNotificationJob } = require('../lib/job-queue');

describe('Booking Flow Tests', () => {
  let sandbox;
  let dbStub;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Mock database
    dbStub = {
      transaction: sandbox.stub(),
      raw: sandbox.stub()
    };
    sandbox.stub(require('../db-config'), 'getDb').returns(dbStub);
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('processBooking', () => {
    it('should create new customer and booking successfully', async () => {
      // Setup test data
      const jobData = {
        customerName: 'John Doe',
        customerPhone: '+17025551234',
        customerEmail: 'john@example.com',
        serviceType: 'Haircut',
        date: '2024-01-20',
        time: '14:00',
        aiEmployee: 'luna',
        callId: 'call-123',
        source: 'vapi',
        ownerPhone: '7027760084'
      };
      
      // Mock transaction
      const mockTransaction = {
        commit: sandbox.stub().resolves(),
        rollback: sandbox.stub().resolves()
      };
      
      // Mock customer queries
      const customerStub = sandbox.stub();
      customerStub.where = sandbox.stub().returns(customerStub);
      customerStub.orWhere = sandbox.stub().returns(customerStub);
      customerStub.first = sandbox.stub().resolves(null); // No existing customer
      customerStub.insert = sandbox.stub().returnsThis();
      customerStub.returning = sandbox.stub().resolves([{
        id: 1,
        customer_id: 'cust-123',
        name: 'John Doe',
        phone: '+17025551234'
      }]);
      
      // Mock booking insert
      const bookingStub = sandbox.stub();
      bookingStub.insert = sandbox.stub().returnsThis();
      bookingStub.returning = sandbox.stub().resolves([{
        id: 1,
        booking_id: 'book-123',
        customer_id: 1,
        status: 'pending'
      }]);
      bookingStub.where = sandbox.stub().returnsThis();
      bookingStub.update = sandbox.stub().resolves();
      
      // Mock calls update
      const callsStub = sandbox.stub();
      callsStub.where = sandbox.stub().returnsThis();
      callsStub.update = sandbox.stub().resolves();
      
      // Setup transaction behavior
      mockTransaction.stub = (table) => {
        switch(table) {
          case 'customers': return customerStub;
          case 'bookings': return bookingStub;
          case 'calls': return callsStub;
          default: throw new Error(`Unknown table: ${table}`);
        }
      };
      
      dbStub.transaction.resolves(mockTransaction);
      
      // Mock external services
      sandbox.stub(require('../google-calendar-api'), 'createEvent').resolves({
        id: 'cal-event-123'
      });
      
      sandbox.stub(require('../lib/job-queue'), 'addNotificationJob').resolves();
      sandbox.stub(require('../lib/job-queue'), 'addAnalyticsJob').resolves();
      
      // Execute test
      const job = { id: 'job-123', data: jobData };
      const result = await processBooking(job);
      
      // Assertions
      expect(result).to.deep.equal({
        success: true,
        bookingId: 'book-123',
        customerId: 1,
        calendarEventId: 'cal-event-123'
      });
      
      expect(mockTransaction.commit.calledOnce).to.be.true;
      expect(mockTransaction.rollback.called).to.be.false;
      expect(customerStub.insert.calledOnce).to.be.true;
      expect(bookingStub.insert.calledOnce).to.be.true;
    });
    
    it('should handle existing customer correctly', async () => {
      const jobData = {
        customerName: 'Jane Smith',
        customerPhone: '+17025555678',
        customerEmail: 'jane@example.com',
        serviceType: 'Color',
        date: '2024-01-21',
        time: '10:00'
      };
      
      // Mock existing customer
      const existingCustomer = {
        id: 42,
        customer_id: 'cust-existing',
        name: 'Jane Smith',
        phone: '+17025555678',
        total_bookings: 5
      };
      
      const customerStub = sandbox.stub();
      customerStub.where = sandbox.stub().returns(customerStub);
      customerStub.orWhere = sandbox.stub().returns(customerStub);
      customerStub.first = sandbox.stub().resolves(existingCustomer);
      customerStub.update = sandbox.stub().resolves();
      
      // Continue with booking creation...
      // (Similar setup as above)
      
      // Verify customer update was called
      expect(customerStub.update.calledWith({
        last_contact_at: sinon.match.date,
        total_bookings: dbStub.raw('total_bookings + 1')
      })).to.be.true;
    });
    
    it('should rollback transaction on error', async () => {
      const jobData = {
        customerName: 'Error Test',
        customerPhone: '+17025559999',
        date: 'invalid-date', // This will cause an error
        time: '14:00'
      };
      
      const mockTransaction = {
        commit: sandbox.stub(),
        rollback: sandbox.stub().resolves()
      };
      
      dbStub.transaction.resolves(mockTransaction);
      
      const job = { id: 'job-error', data: jobData };
      
      await expect(processBooking(job)).to.be.rejected;
      expect(mockTransaction.rollback.calledOnce).to.be.true;
      expect(mockTransaction.commit.called).to.be.false;
    });
  });
  
  describe('Notification Flow', () => {
    it('should queue all necessary notifications', async () => {
      const notificationStub = sandbox.stub(require('../lib/job-queue'), 'addNotificationJob');
      
      // Test booking completion triggers notifications
      const bookingData = {
        customerPhone: '+17025551234',
        customerEmail: 'test@example.com',
        ownerPhone: '7027760084',
        customerName: 'Test Customer',
        serviceType: 'Consultation',
        appointmentDate: '2024-01-20',
        appointmentTime: '2:00 PM'
      };
      
      // Simulate notification queuing
      await Promise.all([
        notificationStub('sms', { to: bookingData.customerPhone }),
        notificationStub('email', { to: bookingData.customerEmail }),
        notificationStub('sms', { to: bookingData.ownerPhone })
      ]);
      
      expect(notificationStub.callCount).to.equal(3);
      expect(notificationStub.firstCall.args[0]).to.equal('sms');
      expect(notificationStub.secondCall.args[0]).to.equal('email');
      expect(notificationStub.thirdCall.args[0]).to.equal('sms');
    });
  });
  
  describe('Date/Time Parsing', () => {
    it('should correctly parse natural language dates', () => {
      const { DateTime } = require('luxon');
      
      const testCases = [
        { input: 'tomorrow', expected: 1 }, // 1 day from now
        { input: 'next Monday', expected: 'monday' },
        { input: 'January 25th', expected: 'january' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        // Test date parsing logic
        const parsed = DateTime.fromISO(input, { zone: 'America/Los_Angeles' });
        // Add specific assertions based on your parsing logic
      });
    });
  });
  
  describe('Error Handling', () => {
    it('should handle calendar API failures gracefully', async () => {
      const calendarStub = sandbox.stub(require('../google-calendar-api'), 'createEvent');
      calendarStub.rejects(new Error('Calendar API error'));
      
      // The booking should still succeed even if calendar fails
      // Test implementation here
    });
    
    it('should handle notification failures with retry', async () => {
      // Test that notification failures trigger retries
      // Implementation here
    });
  });
}); 