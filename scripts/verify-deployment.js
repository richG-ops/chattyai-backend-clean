#!/usr/bin/env node

/**
 * Production Deployment Verification Script
 * Tests all critical endpoints and functionality
 * Based on elite SRE practices from Google, Netflix, Stripe
 */

const https = require('https');
const assert = require('assert');

const config = {
  apiUrl: process.env.API_URL || 'https://chattyai-backend-clean.onrender.com',
  frontendUrl: process.env.FRONTEND_URL || 'https://app.thechattyai.com',
  timeout: 10000,
  retries: 3
};

class DeploymentVerifier {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout: ${url}`));
      }, config.timeout);

      const req = https.request(url, options, (res) => {
        clearTimeout(timeout);
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            responseTime: Date.now() - startTime
          });
        });
      });

      const startTime = Date.now();
      req.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  async test(name, testFn) {
    process.stdout.write(`Testing ${name}... `);
    
    try {
      const startTime = Date.now();
      await testFn();
      const duration = Date.now() - startTime;
      
      console.log(`✅ PASS (${duration}ms)`);
      this.results.push({ name, status: 'PASS', duration });
      this.passed++;
    } catch (error) {
      console.log(`❌ FAIL - ${error.message}`);
      this.results.push({ name, status: 'FAIL', error: error.message });
      this.failed++;
    }
  }

  async verifyHealth() {
    await this.test('Backend Health Check', async () => {
      const response = await this.makeRequest(`${config.apiUrl}/healthz`);
      assert.strictEqual(response.statusCode, 200, `Expected 200, got ${response.statusCode}`);
      
      const health = JSON.parse(response.body);
      assert.strictEqual(health.status, 'healthy', 'Service not healthy');
      assert(health.uptime > 0, 'Invalid uptime');
      assert(health.timestamp, 'Missing timestamp');
      
      // Verify response time is acceptable
      assert(response.responseTime < 1000, `Response time too slow: ${response.responseTime}ms`);
    });
  }

  async verifyApiEndpoints() {
    await this.test('API Root Endpoint', async () => {
      const response = await this.makeRequest(`${config.apiUrl}/`);
      assert.strictEqual(response.statusCode, 200, `Expected 200, got ${response.statusCode}`);
      
      const data = JSON.parse(response.body);
      assert.strictEqual(data.name, 'TheChattyAI Calendar API', 'Invalid API name');
      assert(data.endpoints, 'Missing endpoints information');
    });

    await this.test('VAPI Simple Endpoint', async () => {
      const response = await this.makeRequest(`${config.apiUrl}/vapi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          function: 'checkAvailability',
          parameters: { date: 'tomorrow' }
        })
      });
      
      assert(response.statusCode >= 200 && response.statusCode < 300, 
        `Expected 2xx, got ${response.statusCode}`);
      
      const data = JSON.parse(response.body);
      assert(data.response, 'Missing response field');
    });
  }

  async verifySecurityHeaders() {
    await this.test('Security Headers', async () => {
      const response = await this.makeRequest(`${config.apiUrl}/healthz`);
      
      const requiredHeaders = [
        'x-frame-options',
        'x-content-type-options', 
        'x-xss-protection'
      ];
      
      for (const header of requiredHeaders) {
        assert(response.headers[header], `Missing security header: ${header}`);
      }
    });
  }

  async verifyCORS() {
    await this.test('CORS Configuration', async () => {
      const response = await this.makeRequest(`${config.apiUrl}/healthz`, {
        headers: {
          'Origin': 'https://app.thechattyai.com'
        }
      });
      
      // Should not fail due to CORS
      assert(response.statusCode < 400, 'CORS blocking legitimate requests');
    });
  }

  async verifyPerformance() {
    await this.test('Performance Benchmarks', async () => {
      const requests = [];
      const concurrency = 5;
      
      // Test concurrent requests
      for (let i = 0; i < concurrency; i++) {
        requests.push(this.makeRequest(`${config.apiUrl}/healthz`));
      }
      
      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach((response, index) => {
        assert(response.statusCode === 200, `Request ${index} failed`);
        assert(response.responseTime < 2000, `Request ${index} too slow: ${response.responseTime}ms`);
      });
      
      // Calculate average response time
      const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
      assert(avgResponseTime < 1000, `Average response time too slow: ${avgResponseTime}ms`);
    });
  }

  async verifyFrontend() {
    if (!config.frontendUrl.includes('localhost')) {
      await this.test('Frontend Availability', async () => {
        const response = await this.makeRequest(config.frontendUrl);
        assert(response.statusCode === 200, `Frontend not available: ${response.statusCode}`);
        assert(response.body.includes('TheChattyAI'), 'Frontend content not loaded correctly');
      });
    }
  }

  async runAll() {
    console.log('🚀 Starting Production Deployment Verification');
    console.log(`API URL: ${config.apiUrl}`);
    console.log(`Frontend URL: ${config.frontendUrl}`);
    console.log('=' * 60);
    
    await this.verifyHealth();
    await this.verifyApiEndpoints();
    await this.verifySecurityHeaders();
    await this.verifyCORS();
    await this.verifyPerformance();
    await this.verifyFrontend();
    
    this.printResults();
  }

  printResults() {
    console.log('\n' + '=' * 60);
    console.log('DEPLOYMENT VERIFICATION RESULTS');
    console.log('=' * 60);
    
    this.results.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      const timing = result.duration ? ` (${result.duration}ms)` : '';
      console.log(`${status} ${result.name}${timing}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log('\n' + '-' * 60);
    console.log(`SUMMARY: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed === 0) {
      console.log('🎉 ALL TESTS PASSED - DEPLOYMENT VERIFIED');
      console.log('✅ Service is ready for production traffic');
      process.exit(0);
    } else {
      console.log('❌ DEPLOYMENT VERIFICATION FAILED');
      console.log('🚨 Service is NOT ready for production traffic');
      process.exit(1);
    }
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new DeploymentVerifier();
  verifier.runAll().catch(error => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  });
}

module.exports = DeploymentVerifier; 