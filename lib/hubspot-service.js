// ============================================================================
// HUBSPOT CRM SYNC SERVICE
// ============================================================================
// Author: Elite Implementation Team
// Purpose: Create/update leads in HubSpot via v3 API
// Env Vars: HUBSPOT_API_KEY
// ============================================================================

const axios = require('axios');

class HubSpotService {
  constructor() {
    this.apiKey = process.env.HUBSPOT_API_KEY;
    this.enabled = !!this.apiKey;
    this.baseUrl = 'https://api.hubapi.com';

    if (!this.enabled) {
      console.warn('⚠️  HubSpot sync disabled - missing HUBSPOT_API_KEY');
    }
  }

  /**
   * Create or update a contact/lead
   * @param {object} leadData - { email, phone, firstname, lastname, ... }
   */
  async upsertLead(leadData) {
    if (!this.enabled) return { status: 'disabled' };

    try {
      const res = await axios.post(
        `${this.baseUrl}/crm/v3/objects/contacts`,
        {
          properties: {
            email: leadData.email,
            phone: leadData.phone,
            firstname: leadData.firstname,
            lastname: leadData.lastname,
            company: leadData.company,
            lead_source: 'ChattyAI'
          }
        },
        {
          params: { hapikey: this.apiKey },
          timeout: 10000
        }
      );
      return res.data;
    } catch (error) {
      console.error('HubSpot API error:', error.response?.data || error.message);
      return { status: 'error', message: error.message };
    }
  }
}

module.exports = new HubSpotService(); 