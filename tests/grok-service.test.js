import grokService from '../lib/grok-service';
import axios from 'axios';

jest.mock('axios');

describe('GrokService', () => {
  test('returns sentiment from API', async () => {
    axios.post.mockResolvedValue({ data: { choices: [ { message: { content: 'positive' } } ] } });
    process.env.GROK_API_KEY = 'test';
    const sentiment = await grokService.analyzeSentiment('Great service!');
    expect(sentiment).toBe('positive');
  });

  test('returns unknown on error', async () => {
    axios.post.mockRejectedValue(new Error('Network error'));
    const sentiment = await grokService.analyzeSentiment('Bad service');
    expect(sentiment).toBe('unknown');
  });
}); 