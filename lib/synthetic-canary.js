const axios = require('axios');
const { getDb } = require('../db-config');
const { addAnalyticsJob } = require('./job-queue');

const { newId } = require('../lib/id');

// Synthetic canary for continuous monitoring
class SyntheticCanary {
  constructor() {
    this.vapiApiKey = process.env.VAPI_API_KEY;
    this.webhookUrl = process.env.WEBHOOK_URL || 'https://chattyai-backend-clean.onrender.com/api/vapi-webhook';
    this.testPhoneNumber = process.env.CANARY_PHONE_NUMBER || '+1234567890';
    this.monitoringInterval = 30 * 60 * 1000; // 30 minutes
    this.db = getDb();
  }

  // Create a test call for a specific tenant
  async createTestCall(tenantId, assistantId) {
    try {
      const response = await axios.post('https://api.vapi.ai/calls', {
        assistantId: assistantId,
        customer: {
          number: this.testPhoneNumber,
          name: 'Canary Test'
        },
        metadata: {
          type: 'synthetic_canary',
          tenantId: tenantId,
          timestamp: new Date().toISOString()
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.vapiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`🐤 Canary call created for tenant ${tenantId}:`, response.data.id);
      
      // Track canary call
      await this.trackCanaryCall(tenantId, response.data.id, 'created');
      
      return response.data;
    } catch (error) {
      console.error(`❌ Canary call failed for tenant ${tenantId}:`, error.message);
      
      // Alert on canary failure
      await this.alertCanaryFailure(tenantId, error.message);
      
      throw error;
    }
  }

  // Track canary call status
  async trackCanaryCall(tenantId, callId, status, metadata = {}) {
    try {
      await this.db('canary_calls').insert({
        id: newId(),
        tenant_id: tenantId,
        call_id: callId,
        status: status,
        metadata: JSON.stringify(metadata),
        created_at: new Date()
      });
    } catch (error) {
      console.error('Failed to track canary call:', error);
    }
  }

  // Alert on canary failure
  async alertCanaryFailure(tenantId, error) {
    console.error(`🚨 CANARY FAILURE for tenant ${tenantId}:`, error);
    
    // Add to analytics queue for alerting
    await addAnalyticsJob('canary_failure', {
      tenantId: tenantId,
      error: error,
      timestamp: new Date().toISOString(),
      severity: 'high'
    });

    // Store failure in database
    await this.db('canary_failures').insert({
      id: newId(),
      tenant_id: tenantId,
      error_message: error,
      created_at: new Date()
    });
  }

  // Get all active tenants with their assistants
  async getActiveTenants() {
    try {
      const tenants = await this.db('customers')
        .select('tenant_id', 'vapi_assistant_id')
        .whereNotNull('vapi_assistant_id')
        .groupBy('tenant_id', 'vapi_assistant_id');
      
      return tenants.map(t => ({
        tenantId: t.tenant_id,
        assistantId: t.vapi_assistant_id
      }));
    } catch (error) {
      console.error('Failed to get active tenants:', error);
      return [];
    }
  }

  // Run canary tests for all tenants
  async runCanaryTests() {
    console.log('🐤 Starting canary monitoring cycle...');
    
    const tenants = await this.getActiveTenants();
    
    if (tenants.length === 0) {
      console.log('No active tenants found for canary testing');
      return;
    }

    const results = await Promise.allSettled(
      tenants.map(tenant => this.createTestCall(tenant.tenantId, tenant.assistantId))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`🐤 Canary cycle complete: ${successful} successful, ${failed} failed`);
    
    // Alert if high failure rate
    if (failed > 0 && failed / tenants.length > 0.2) {
      console.error(`🚨 High canary failure rate: ${failed}/${tenants.length}`);
      await addAnalyticsJob('canary_high_failure_rate', {
        successful,
        failed,
        totalTenants: tenants.length,
        failureRate: failed / tenants.length,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Start continuous monitoring
  start() {
    console.log(`🐤 Starting canary monitoring every ${this.monitoringInterval / 60000} minutes`);
    
    // Run immediately
    this.runCanaryTests();
    
    // Schedule regular runs
    this.intervalId = setInterval(() => {
      this.runCanaryTests();
    }, this.monitoringInterval);
  }

  // Stop monitoring
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🐤 Canary monitoring stopped');
    }
  }
}

module.exports = SyntheticCanary; 