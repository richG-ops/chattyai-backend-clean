const axios = require('axios');

// AssemblyAI/Deepgram API keys should be set in env
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

async function extractEntitiesFromText(text) {
  // Try AssemblyAI first if key is present
  if (ASSEMBLYAI_API_KEY) {
    try {
      const response = await axios.post(
        'https://api.assemblyai.com/v2/entity-detection',
        { text },
        { headers: { 'authorization': ASSEMBLYAI_API_KEY } }
      );
      const entities = response.data.entities || {};
      // Assume AssemblyAI returns confidence per entity
      const confidence = entities.confidence || 0.9;
      return { entities, confidence };
    } catch (err) {
      console.error('AssemblyAI entity extraction failed:', err.message);
    }
  }
  // Try Deepgram if key is present
  if (DEEPGRAM_API_KEY) {
    try {
      const response = await axios.post(
        'https://api.deepgram.com/v1/listen?detect_entities=true',
        { text },
        { headers: { 'Authorization': `Token ${DEEPGRAM_API_KEY}` } }
      );
      const entities = response.data.entities || {};
      const confidence = entities.confidence || 0.85;
      return { entities, confidence };
    } catch (err) {
      console.error('Deepgram entity extraction failed:', err.message);
    }
  }
  // Fallback to regex
  const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const phone = (text.match(phoneRegex) || [])[0];
  const email = (text.match(emailRegex) || [])[0];
  const confidence = (phone && email) ? 0.7 : 0.5;
  return { entities: { phone, email }, confidence };
}

// Placeholder for SMS confirmation (to be called by booking processor if needed)
async function queueSMSConfirmation(phone, entities) {
  // This should add a job to notification queue to confirm details via SMS
  // e.g., "We heard your phone/email as X/Y. Reply YES to confirm or call us."
  // Implemented in notification-processor.js
}

module.exports = { extractEntitiesFromText, queueSMSConfirmation }; 