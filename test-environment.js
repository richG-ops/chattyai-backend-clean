#!/usr/bin/env node

const axios = require('axios');
const jwt = require('jsonwebtoken');

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:4000';
const TEST_TENANT_ID = 'test-tenant-123';

// Generate a test JWT token
function generateTestToken() {
  const payload = {
    tenant_id: TEST_TENANT_ID,
    user_id: 'test-user-123',
    permissions: ['read', 'write']
  };
  
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

// Test helper function
async function testEndpoint(endpoint, method = 'GET', data = null, description = '') {
  try {
    const token = generateTestToken();
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    console.log(`🧪 Testing: ${description || `${method} ${endpoint}`}`);
    const response = await axios(config);
    console.log(`✅ Success: ${response.status} - ${JSON.stringify(response.data, null, 2)}`);
    return true;
  } catch (error) {
    console.log(`❌ Failed: ${error.response?.status || error.code} - ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting API Tests');
  console.log('=====================\n');
  
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
        summary: 'Test Appointment from API'
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
  
  console.log('📊 Test Results');
  console.log('===============');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Your API is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check your environment variables and Google OAuth setup.');
  }
}

// Health check function
async function healthCheck() {
  try {
    console.log('🏥 Health Check');
    console.log('==============');
    
    const response = await axios.get(`${BASE_URL}/health`);
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
    console.log(`🔗 Testing API at: ${BASE_URL}\n`);
    
    // First run health check
    const healthy = await healthCheck();
    console.log('');
    
    if (healthy) {
      await runTests();
    } else {
      console.log('❌ Skipping tests due to health check failure');
      console.log('💡 Make sure your server is running and accessible');
    }
  })();
}

module.exports = { testEndpoint, generateTestToken, healthCheck }; 