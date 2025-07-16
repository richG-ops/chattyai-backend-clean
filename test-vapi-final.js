#!/usr/bin/env node

const axios = require('axios');

async function testVapi() {
  console.log('🧪 Testing VAPI Endpoint...');
  
  try {
    // Test health first
    console.log('\n1. Testing health endpoint...');
    const health = await axios.get('https://chattyai-backend-clean.onrender.com/healthz');
    console.log('✅ Health:', health.data);
    
    // Test VAPI
    console.log('\n2. Testing VAPI endpoint...');
    const vapi = await axios.post('https://chattyai-backend-clean.onrender.com/vapi', {
      function: 'checkAvailability',
      parameters: {}
    });
    console.log('✅ VAPI Response:', vapi.data);
    
    console.log('\n🎉 ALL TESTS PASSED!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.status, error.response?.statusText);
    console.error('URL:', error.config?.url);
    console.error('Method:', error.config?.method);
    
    if (error.response?.status === 404) {
      console.log('\n🔍 404 Analysis:');
      console.log('- Route might not be loaded');
      console.log('- Check server logs for route registration');
      console.log('- Verify google-calendar-api.js is running');
    }
  }
}

testVapi(); 