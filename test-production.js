#!/usr/bin/env node

const axios = require('axios');
const jwt = require('jsonwebtoken');

// Production test configuration
const PRODUCTION_URL = 'https://chattyai-calendar-bot-1.onrender.com';
const TEST_TENANT_ID = 'test-tenant-123';

// Generate a test JWT token
function generateTestToken() {
  const payload = {
    api_key: 'test-api-key-123',
    tenant_id: TEST_TENANT_ID,
    user_id: 'test-user-123'
  };
  
  // Use the JWT secret from the auth middleware
  const secret = 'your-super-secret-jwt-key-change-this-in-production';
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

// Test helper function
async function testEndpoint(endpoint, method = 'GET', data = null, description = '') {
  try {
    const token = generateTestToken();
    const config = {
      method,
      url: `${PRODUCTION_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    };
    
    if (data) {
      config.data = data;
    }
    
    console.log(`🧪 Testing: ${description || `${method} ${endpoint}`}`);
    console.log(`🔗 URL: ${config.url}`);
    
    const response = await axios(config);
    console.log(`✅ Success: ${response.status}`);
    console.log(`📊 Response: ${JSON.stringify(response.data, null, 2)}`);
    return true;
  } catch (error) {
    console.log(`❌ Failed: ${error.response?.status || error.code}`);
    if (error.response?.data) {
      console.log(`📋 Error details: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`📋 Error: ${error.message}`);
    }
    return false;
  }
}

// Main test function
async function runProductionTests() {
  console.log('🚀 Testing Production API');
  console.log('========================');
  console.log(`🌐 URL: ${PRODUCTION_URL}\n`);
  
  const tests = [
    {
      endpoint: '/get-availability',
      method: 'GET',
      description: 'Get available time slots'
    },
    {
      endpoint: '/book-appointment',
      method: 'POST',
      data: {
        start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // Tomorrow + 30 min
        summary: 'Test Appointment from Production API'
      },
      description: 'Book a test appointment'
    }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const success = await testEndpoint(
      test.endpoint,
      test.method,
      test.data,
      test.description
    );
    if (success) passed++;
    console.log(''); // Empty line for readability
  }
  
  console.log('📊 Production Test Results');
  console.log('==========================');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED! Your production API is working perfectly!');
    console.log('🌐 Your API is live and ready for use at:');
    console.log(`   ${PRODUCTION_URL}`);
  } else {
    console.log('\n⚠️ Some tests failed. Check your logs and environment variables.');
  }
}

// Health check function
async function healthCheck() {
  try {
    console.log('🏥 Production Health Check');
    console.log('==========================');
    
    const response = await axios.get(`${PRODUCTION_URL}/health`, { timeout: 5000 });
    console.log(`✅ Health check passed: ${response.status}`);
    console.log(`📊 Response: ${JSON.stringify(response.data, null, 2)}`);
    return true;
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  (async () => {
    // First run health check
    const healthy = await healthCheck();
    console.log('');
    
    if (healthy) {
      await runProductionTests();
    } else {
      console.log('❌ Skipping tests due to health check failure');
      console.log('💡 Check if your server is accessible or if there are any issues');
    }
  })();
}

module.exports = { testEndpoint, generateTestToken, healthCheck }; 