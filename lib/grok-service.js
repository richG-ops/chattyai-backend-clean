// ============================================================================
// GROK SENTIMENT ANALYSIS SERVICE (2025)
// ============================================================================
// Author: Elite Implementation Team
// Purpose: Analyze sentiment of call transcripts using xAI Grok API
// Env Vars: GROK_API_KEY (required for production)
// ============================================================================

const axios = require('axios');
const z = require('zod');

const grokSchema = z.object({
  transcript: z.string().min(1)
});

class GrokService {
  constructor() {
    this.apiKey = process.env.GROK_API_KEY;
    this.enabled = !!this.apiKey;
    this.baseUrl = 'https://api.x.ai/v1/chat/completions';

    if (!this.enabled) {
      console.warn('⚠️  Grok sentiment disabled - missing GROK_API_KEY');
    }
  }

  /**
   * Analyze transcript sentiment
   * @param {string} transcript - full transcript text
   * @returns {Promise<'positive'|'negative'|'neutral'|'unknown'>}
   */
  async analyzeSentiment(transcript) {
    try {
      grokSchema.parse({ transcript });
    } catch (err) {
      console.error('Grok validation error:', err);
      return 'unknown';
    }

    if (!this.enabled) return 'unknown';

    try {
      const { data } = await axios.post(
        this.baseUrl,
        {
          model: 'grok-sentiment-2025',
          messages: [
            {
              role: 'system',
              content: 'You are a sentiment analysis engine. Return only "positive", "negative", or "neutral".'
            },
            {
              role: 'user',
              content: transcript.slice(0, 8000) // Grok token limit safety
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const sentiment = (data.choices?.[0]?.message?.content || '').trim().toLowerCase();
      if (['positive', 'negative', 'neutral'].includes(sentiment)) {
        return sentiment;
      }
      return 'unknown';
    } catch (error) {
      console.error('Grok API error:', error.response?.data || error.message);
      return 'unknown';
    }
  }
}

module.exports = new GrokService(); 