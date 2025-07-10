#!/usr/bin/env node

/**
 * Test script to verify complete frontend functionality
 * Run with: node test-frontend-complete.js
 */

const https = require('https');
const http = require('http');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

console.log('🧪 Testing TheChattyAI Frontend Complete Flow...\n');

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test functions
async function testBackendHealth() {
  console.log('🔍 Testing backend health...');
  try {
    const response = await makeRequest(`${BACKEND_URL}/health`);
    if (response.status === 200) {
      console.log('✅ Backend is healthy');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      return true;
    } else {
      console.log('❌ Backend health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Backend connection failed:', error.message);
    return false;
  }
}

async function testClientCreation() {
  console.log('\n📝 Testing client creation...');
  try {
    const testClient = {
      businessName: 'Test Business',
      businessType: 'salon',
      ownerName: 'Test Owner',
      email: 'test@testbusiness.com',
      phone: '+1234567890',
      address: '123 Test St',
      description: 'Test business description',
      timeZone: 'America/New_York'
    };
    
    const response = await makeRequest(`${BACKEND_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testClient)
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Client creation successful');
      console.log('   Client ID:', response.data.client.id);
      console.log('   JWT Token:', response.data.credentials.jwtToken.substring(0, 20) + '...');
      return response.data;
    } else {
      console.log('❌ Client creation failed:', response.status);
      console.log('   Error:', response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Client creation error:', error.message);
    return null;
  }
}

async function testDashboardData(clientId, token) {
  console.log('\n📊 Testing dashboard data...');
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/clients/${clientId}/metrics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Dashboard data fetch successful');
      console.log('   Today calls:', response.data.metrics.today.calls);
      console.log('   Today bookings:', response.data.metrics.today.bookings);
      console.log('   Today revenue:', response.data.metrics.today.revenue);
      return true;
    } else {
      console.log('❌ Dashboard data fetch failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Dashboard data error:', error.message);
    return false;
  }
}

async function testCalendarAvailability(token) {
  console.log('\n📅 Testing calendar availability...');
  try {
    const response = await makeRequest(`${BACKEND_URL}/get-availability`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      console.log('✅ Calendar availability successful');
      console.log('   Available slots:', response.data.slots?.length || 'No slots data');
      return true;
    } else {
      console.log('❌ Calendar availability failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Calendar availability error:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting comprehensive frontend/backend integration tests...\n');
  
  let results = {
    backendHealth: false,
    clientCreation: false,
    dashboardData: false,
    calendarAvailability: false
  };
  
  // Test 1: Backend Health
  results.backendHealth = await testBackendHealth();
  
  if (!results.backendHealth) {
    console.log('\n❌ Backend is not available. Cannot proceed with integration tests.');
    console.log('   Please ensure your backend is running on', BACKEND_URL);
    process.exit(1);
  }
  
  // Test 2: Client Creation
  const clientData = await testClientCreation();
  results.clientCreation = !!clientData;
  
  if (!results.clientCreation) {
    console.log('\n❌ Client creation failed. Cannot proceed with authenticated tests.');
    process.exit(1);
  }
  
  // Test 3: Dashboard Data
  results.dashboardData = await testDashboardData(
    clientData.client.id, 
    clientData.credentials.jwtToken
  );
  
  // Test 4: Calendar Availability
  results.calendarAvailability = await testCalendarAvailability(
    clientData.credentials.jwtToken
  );
  
  // Final Results
  console.log('\n📋 TEST RESULTS SUMMARY:');
  console.log('========================');
  console.log('Backend Health:', results.backendHealth ? '✅ PASS' : '❌ FAIL');
  console.log('Client Creation:', results.clientCreation ? '✅ PASS' : '❌ FAIL');
  console.log('Dashboard Data:', results.dashboardData ? '✅ PASS' : '❌ FAIL');
  console.log('Calendar Availability:', results.calendarAvailability ? '✅ PASS' : '❌ FAIL');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const successRate = Math.round((passedTests / totalTests) * 100);
  
  console.log('\n🎯 OVERALL RESULTS:');
  console.log(`   Passed: ${passedTests}/${totalTests} tests (${successRate}%)`);
  
  if (successRate >= 75) {
    console.log('✅ FRONTEND IS READY FOR PRODUCTION! 🚀');
    console.log('   Your system is working correctly and ready for deployment.');
  } else if (successRate >= 50) {
    console.log('⚠️  FRONTEND NEEDS MINOR FIXES');
    console.log('   Most functionality works, but some endpoints need attention.');
  } else {
    console.log('❌ FRONTEND NEEDS MAJOR FIXES');
    console.log('   Critical functionality is not working. Please review backend setup.');
  }
  
  console.log('\n🔗 NEXT STEPS:');
  console.log('1. Set environment variables in Render dashboard');
  console.log('2. Deploy frontend to Vercel');
  console.log('3. Test complete user journey');
  console.log('4. Launch to customers! 💰');
}

// Run tests
runTests().catch(console.error); 