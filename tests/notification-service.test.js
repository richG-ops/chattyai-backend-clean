import NotificationService from '../lib/notification-service';
import promiseRetry from 'promise-retry';

jest.mock('twilio', () => () => ({
  messages: {
    create: jest.fn().mockResolvedValue({ sid: 'mock_sid', status: 'sent' })
  }
}));

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }])
}));

jest.mock('promise-retry', () => jest.fn(fn => fn(jest.fn(), 1)));

const notificationService = new NotificationService();

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sendSMS should retry on failure', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const mockRetry = jest.fn();
    promiseRetry.mockImplementation(fn => fn(mockRetry, 1));

    await notificationService.sendSMS('+1234567890', 'test_template', { recipient: 'customer' });

    expect(mockRetry).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Sending SMS (attempt 1)'));
    spy.mockRestore();
  });

  test('sendEmail should send email successfully', async () => {
    await notificationService.sendEmail('test@example.com', 'test_template', { recipient: 'customer' });

    expect(require('@sendgrid/mail').send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'test@example.com'
    }));
  });
}); 