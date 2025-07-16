import hubspotService from '../lib/hubspot-service';
import axios from 'axios';

jest.mock('axios');

describe('HubSpotService', () => {
  beforeEach(() => {
    process.env.HUBSPOT_API_KEY = 'test';
  });

  test('upsertLead returns data on success', async () => {
    axios.post.mockResolvedValue({ data: { id: '123' } });
    const res = await hubspotService.upsertLead({ email: 'test@example.com', phone: '+123', firstname: 'Test', lastname: 'User' });
    expect(res).toEqual({ id: '123' });
  });

  test('upsertLead returns error object on failure', async () => {
    axios.post.mockRejectedValue(new Error('fail'));
    const res = await hubspotService.upsertLead({ email: 'a', phone: 'b' });
    expect(res.status).toBe('error');
  });
}); 