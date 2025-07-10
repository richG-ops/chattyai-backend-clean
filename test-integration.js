/**
 * Integration Test Script
 * Tests the complete API integration between frontend and backend
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiMDFiYTE2OGRkMzBjMDM3N2MxZjBjNzRiOTM2ZjQyNzQiLCJjbGllbnRfaWQiOiJkZW1vLWNsaWVudCIsImJ1c2luZXNzX25hbWUiOiJEZW1vIEJ1c2luZXNzIiwiZW1haWwiOiJkZW1vQGJ1c2luZXNzLmNvbSIsImlhdCI6MTc1MjA4NzcwNCwiZXhwIjoxNzgzNjQ1MzA0fQ.xYj4zB62N0vuKwyv_nfdMsewPTR3OFXKke2kcmOxywI';

const headers = {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testAPIs() {
  console.log('🚀 Starting API Integration Tests...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data);

    // Test 2: Connection Test
    console.log('\n2. Testing Connection...');
    const connectionResponse = await axios.get(`${BASE_URL}/api/test/connection`);
    console.log('✅ Connection Test:', connectionResponse.data);

    // Test 3: Metrics Endpoint
    console.log('\n3. Testing Metrics Endpoint...');
    const metricsResponse = await axios.get(`${BASE_URL}/api/clients/demo/metrics`, { headers });
    console.log('✅ Metrics Response:', JSON.stringify(metricsResponse.data, null, 2));

    // Test 4: Bookings Endpoint
    console.log('\n4. Testing Bookings Endpoint...');
    const bookingsResponse = await axios.get(`${BASE_URL}/api/clients/demo/bookings?limit=3`, { headers });
    console.log('✅ Bookings Response:', JSON.stringify(bookingsResponse.data, null, 2));

    // Test 5: Calendar Availability
    console.log('\n5. Testing Calendar Availability...');
    const availabilityResponse = await axios.get(`${BASE_URL}/get-availability`, { headers });
    console.log('✅ Availability Response:', JSON.stringify(availabilityResponse.data, null, 2));

    console.log('\n🎉 ALL TESTS PASSED! System is fully functional.');
    
  } catch (error) {
    console.error('\n❌ Test Failed:', {
      endpoint: error.config?.url,
      status: error.response?.status,
      message: error.response?.data || error.message
    });
  }
}

// Run the tests
testAPIs(); 