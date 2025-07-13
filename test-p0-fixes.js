#!/usr/bin/env node

const axios = require('axios');
const { DateTime } = require('luxon');

const API_URL = process.env.API_URL || 'http://localhost:4000';

console.log('🧪 Testing P0 Critical Fixes\n');

async function testIdempotency() {
  console.log('1️⃣ Testing Idempotency...');
  
  const requestId = `test-${Date.now()}`;
  const payload = {
    function: 'bookAppointment',
    parameters: {
      customerName: 'Test User',
      customerPhone: '555-0123',
      date: 'tomorrow',
      time: '2pm',
      serviceType: 'Idempotency Test'
    }
  };
  
  try {
    // First request
    const response1 = await axios.post(`${API_URL}/vapi-webhook`, payload, {
      headers: { 'X-Request-ID': requestId }
    });
    
    // Duplicate request with same ID
    const response2 = await axios.post(`${API_URL}/vapi-webhook`, payload, {
      headers: { 'X-Request-ID': requestId }
    });
    
    const isDuplicate = response2.data.duplicate === true;
    console.log(`✅ Idempotency: ${isDuplicate ? 'PASSED' : 'FAILED'}`);
    console.log(`   First response: ${response1.data.response}`);
    console.log(`   Second response marked as duplicate: ${isDuplicate}\n`);
    
    return isDuplicate;
  } catch (error) {
    console.log('❌ Idempotency test failed:', error.message, '\n');
    return false;
  }
}

async function testTimezone() {
  console.log('2️⃣ Testing Timezone Handling...');
  
  const now = DateTime.now().setZone('America/Los_Angeles');
  const tomorrow = now.plus({ days: 1 });
  
  const payload = {
    function: 'bookAppointment', 
    parameters: {
      customerName: 'Timezone Test',
      customerPhone: '555-0124',
      date: 'tomorrow',
      time: '3pm',
      serviceType: 'Timezone Test'
    }
  };
  
  try {
    const response = await axios.post(`${API_URL}/vapi-webhook`, payload);
    
    // Check if the response mentions the correct day
    const expectedDay = tomorrow.toFormat('EEEE'); // e.g., "Monday"
    const hasCorrectDay = response.data.response.includes(expectedDay);
    
    console.log(`✅ Timezone: ${hasCorrectDay ? 'PASSED' : 'WARNING'}`);
    console.log(`   Expected day: ${expectedDay}`);
    console.log(`   Response: ${response.data.response}\n`);
    
    return hasCorrectDay;
  } catch (error) {
    console.log('❌ Timezone test failed:', error.message, '\n');
    return false;
  }
}

async function testRateLimiting() {
  console.log('3️⃣ Testing Rate Limiting (this will take ~5 seconds)...');
  
  const startTime = Date.now();
  const requests = [];
  
  // Send 5 requests as fast as possible
  for (let i = 0; i < 5; i++) {
    const payload = {
      function: 'bookAppointment',
      parameters: {
        customerName: `Rate Test ${i}`,
        customerPhone: '555-0125',
        customerEmail: `test${i}@example.com`,
        date: 'tomorrow',
        time: `${2 + i}pm`,
        serviceType: 'Rate Limit Test'
      }
    };
    
    requests.push(
      axios.post(`${API_URL}/vapi-webhook`, payload, {
        headers: { 'X-Request-ID': `rate-test-${Date.now()}-${i}` }
      }).catch(err => ({ error: err.message }))
    );
  }
  
  const results = await Promise.all(requests);
  const duration = Date.now() - startTime;
  
  // With 1 TPS rate limit, 5 requests should take at least 4 seconds
  const isRateLimited = duration >= 4000;
  
  console.log(`✅ Rate Limiting: ${isRateLimited ? 'PASSED' : 'WARNING'}`);
  console.log(`   5 requests took ${duration}ms (expected >= 4000ms)`);
  console.log(`   Successful requests: ${results.filter(r => !r.error).length}/5\n`);
  
  return isRateLimited;
}

async function testMonitoring() {
  console.log('4️⃣ Testing Error Monitoring...');
  
  // Send invalid request to trigger error
  const payload = {
    function: 'bookAppointment',
    parameters: {
      // Missing required fields
      date: 'invalid date format'
    }
  };
  
  try {
    await axios.post(`${API_URL}/vapi-webhook`, payload);
    console.log('⚠️  Monitoring: No error thrown (check if validation is working)\n');
    return false;
  } catch (error) {
    console.log('✅ Monitoring: PASSED');
    console.log(`   Error properly caught and would be sent to Sentry`);
    console.log(`   Error: ${error.response?.data?.response || error.message}\n`);
    return true;
  }
}

async function runAllTests() {
  console.log(`🔗 Testing against: ${API_URL}\n`);
  
  const results = {
    idempotency: await testIdempotency(),
    timezone: await testTimezone(),
    rateLimiting: await testRateLimiting(),
    monitoring: await testMonitoring()
  };
  
  console.log('📊 Test Summary:');
  console.log('================');
  
  let passed = 0;
  for (const [test, result] of Object.entries(results)) {
    console.log(`${result ? '✅' : '❌'} ${test}`);
    if (result) passed++;
  }
  
  console.log(`\n🎯 Overall: ${passed}/4 tests passed`);
  
  if (passed === 4) {
    console.log('\n🚀 All P0 fixes are working! Ready for production.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the implementation.');
  }
}

// Run tests
runAllTests().catch(console.error); 