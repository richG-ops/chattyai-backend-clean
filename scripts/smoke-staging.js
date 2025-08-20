#!/usr/bin/env node

/**
 * Smoke test script for staging environment
 * Tests VAPI endpoints: checkAvailability and bookAppointment
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'https://chattyai-backend-clean.onrender.com';
const TIMEOUT = 30000; // 30 seconds

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, description) {
  log(`\n${step} ${description}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testEndpoint(endpoint, method = 'GET', data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BACKEND_URL}${endpoint}`,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

async function runSmokeTest() {
  log('🚀 Starting smoke test for staging environment', 'bright');
  log(`📍 Backend URL: ${BACKEND_URL}`, 'blue');
  log(`⏱️  Timeout: ${TIMEOUT}ms`, 'blue');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test 1: Health check
  logStep('1', 'Testing health endpoint');
  results.total++;
  
  const healthResult = await testEndpoint('/healthz');
  if (healthResult.success && healthResult.status === 200) {
    logSuccess('Health check passed');
    results.passed++;
    results.tests.push({ name: 'Health Check', status: 'PASSED' });
  } else {
    logError(`Health check failed: ${healthResult.error || 'Unknown error'}`);
    results.failed++;
    results.tests.push({ name: 'Health Check', status: 'FAILED', error: healthResult.error });
  }
  
  // Test 2: Check availability
  logStep('2', 'Testing VAPI checkAvailability');
  results.total++;
  
  const availabilityData = {
    function: 'checkAvailability',
    parameters: {}
  };
  
  const availabilityResult = await testEndpoint('/vapi', 'POST', availabilityData);
  if (availabilityResult.success && availabilityResult.status === 200) {
    logSuccess('Availability check passed');
    results.passed++;
    results.tests.push({ name: 'VAPI checkAvailability', status: 'PASSED' });
    
    // Extract first slot for booking test
    const response = availabilityResult.data;
    if (response.data && response.data.slots && response.data.slots.length > 0) {
      const firstSlot = response.data.slots[0];
      logInfo(`Found ${response.data.slots.length} available slots`);
      logInfo(`First slot: ${firstSlot.startLocal} (${firstSlot.startISO})`);
      
      // Test 3: Book appointment
      logStep('3', 'Testing VAPI bookAppointment');
      results.total++;
      
      const bookingData = {
        function: 'bookAppointment',
        parameters: {
          startISO: firstSlot.startISO,
          durationM: 30,
          title: 'Smoke Test Appointment',
          customer: {
            name: 'Smoke Test User',
            phone: '+15551234567',
            email: 'smoke@test.com'
          }
        }
      };
      
      const bookingResult = await testEndpoint('/vapi', 'POST', bookingData);
      if (bookingResult.success && bookingResult.status === 200) {
        logSuccess('Appointment booking passed');
        results.passed++;
        results.tests.push({ name: 'VAPI bookAppointment', status: 'PASSED' });
        
        const bookingResponse = bookingResult.data;
        if (bookingResponse.data && bookingResponse.data.confirmation) {
          logInfo(`Booking confirmed: ${bookingResponse.data.confirmation.id}`);
        }
      } else {
        logError(`Appointment booking failed: ${bookingResult.error || 'Unknown error'}`);
        if (bookingResult.data && bookingResult.data.data && bookingResult.data.data.reason) {
          logWarning(`Reason: ${bookingResult.data.data.reason}`);
        }
        results.failed++;
        results.tests.push({ name: 'VAPI bookAppointment', status: 'FAILED', error: bookingResult.error });
      }
    } else {
      logWarning('No available slots found, skipping booking test');
      results.tests.push({ name: 'VAPI bookAppointment', status: 'SKIPPED', reason: 'No available slots' });
    }
  } else {
    logError(`Availability check failed: ${availabilityResult.error || 'Unknown error'}`);
    if (availabilityResult.data && availabilityResult.data.data && availabilityResult.data.data.reason) {
      logWarning(`Reason: ${availabilityResult.data.data.reason}`);
    }
    results.failed++;
    results.tests.push({ name: 'VAPI checkAvailability', status: 'FAILED', error: availabilityResult.error });
    
    // Skip booking test if availability failed
    logWarning('Skipping booking test due to availability failure');
    results.tests.push({ name: 'VAPI bookAppointment', status: 'SKIPPED', reason: 'Availability check failed' });
  }
  
  // Test 4: Debug calendar (if DEBUG_API_KEY is set)
  if (process.env.DEBUG_API_KEY) {
    logStep('4', 'Testing debug calendar endpoint');
    results.total++;
    
    const debugResult = await testEndpoint('/debug/calendar', 'GET', null, {
      'X-Debug-Key': process.env.DEBUG_API_KEY
    });
    
    if (debugResult.success && debugResult.status === 200) {
      logSuccess('Debug calendar endpoint passed');
      results.passed++;
      results.tests.push({ name: 'Debug Calendar', status: 'PASSED' });
      
      // Log diagnostic info
      const debugData = debugResult.data;
      logInfo(`Calendar base URL: ${debugData.baseUrl === 'not_set' ? 'NOT SET' : 'SET'}`);
      logInfo(`JWT configured: ${debugData.hasJwt ? 'YES' : 'NO'}`);
      logInfo(`Health check: ${debugData.health.ok ? 'OK' : 'FAILED'}`);
      logInfo(`Availability test: ${debugData.availability.ok ? 'OK' : 'FAILED'}`);
    } else {
      logError(`Debug calendar endpoint failed: ${debugResult.error || 'Unknown error'}`);
      results.failed++;
      results.tests.push({ name: 'Debug Calendar', status: 'FAILED', error: debugResult.error });
    }
  } else {
    logInfo('DEBUG_API_KEY not set, skipping debug endpoint test');
  }
  
  // Summary
  log('\n📊 Smoke Test Summary', 'bright');
  log(`Total Tests: ${results.total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`, results.failed > 0 ? 'yellow' : 'green');
  
  log('\n📋 Test Details:', 'bright');
  results.tests.forEach(test => {
    const statusColor = test.status === 'PASSED' ? 'green' : test.status === 'FAILED' ? 'red' : 'yellow';
    const statusSymbol = test.status === 'PASSED' ? '✅' : test.status === 'FAILED' ? '❌' : '⚠️';
    log(`${statusSymbol} ${test.name}: ${test.status}`, statusColor);
    if (test.error) {
      log(`   Error: ${test.error}`, 'red');
    }
    if (test.reason) {
      log(`   Reason: ${test.reason}`, 'yellow');
    }
  });
  
  if (results.failed > 0) {
    log('\n❌ Smoke test failed!', 'red');
    process.exit(1);
  } else {
    log('\n✅ All smoke tests passed!', 'green');
    process.exit(0);
  }
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection at:');
  logError(`Promise: ${promise}`);
  logError(`Reason: ${reason}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logError('Uncaught Exception:');
  logError(error.message);
  logError(error.stack);
  process.exit(1);
});

// Run the smoke test
if (require.main === module) {
  runSmokeTest().catch(error => {
    logError('Smoke test failed to run:');
    logError(error.message);
    process.exit(1);
  });
}

module.exports = { runSmokeTest };
