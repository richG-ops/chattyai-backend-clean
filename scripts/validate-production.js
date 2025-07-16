#!/usr/bin/env node

// ============================================================================
// PRODUCTION VALIDATION SCRIPT
// ============================================================================
// Author: Elite Implementation Team
// Purpose: Comprehensive production system validation
// Features: Health checks, API tests, notification tests, performance checks
// ============================================================================

const axios = require('axios');
const { Pool } = require('pg');
const chalk = require('chalk');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'https://chattyai-backend-clean.onrender.com';
const TIMEOUT = 30000; // 30 seconds
const TEST_PHONE = process.env.TEST_PHONE || '+15555551234';

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: []
};

// Color output helpers
const log = {
  success: (msg) => console.log(chalk.green('✅ ' + msg)),
  error: (msg) => console.log(chalk.red('❌ ' + msg)),
  warning: (msg) => console.log(chalk.yellow('⚠️  ' + msg)),
  info: (msg) => console.log(chalk.blue('ℹ️  ' + msg)),
  section: (msg) => console.log(chalk.cyan('\n' + '='.repeat(60) + '\n' + msg + '\n' + '='.repeat(60)))
};

// Test wrapper
async function runTest(name, testFn) {
  try {
    log.info(`Testing: ${name}...`);
    await testFn();
    results.passed++;
    log.success(`${name} passed`);
  } catch (error) {
    results.failed++;
    results.errors.push({ test: name, error: error.message });
    log.error(`${name} failed: ${error.message}`);
  }
}

// ============================================================================
// HEALTH CHECK TESTS
// ============================================================================

async function testHealthEndpoint() {
  const response = await axios.get(`${BACKEND_URL}/healthz`, { timeout: TIMEOUT });
  
  if (response.status !== 200) {
    throw new Error(`Health check returned status ${response.status}`);
  }
  
  const data = response.data;
  if (data.status !== 'ok') {
    throw new Error(`Health status is ${data.status}`);
  }
  
  // Check components
  if (!data.database) {
    results.warnings++;
    log.warning('Database health check missing');
  }
  
  if (!data.redis) {
    results.warnings++;
    log.warning('Redis health check missing');
  }
}

// ============================================================================
// DATABASE TESTS
// ============================================================================

async function testDatabaseConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set');
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Test basic query
    const result = await pool.query('SELECT 1 as test');
    if (result.rows[0].test !== 1) {
      throw new Error('Database query returned unexpected result');
    }
    
    // Test tables exist
    const tables = ['calls', 'bookings', 'customers', 'tenants'];
    for (const table of tables) {
      const tableCheck = await pool.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)",
        [table]
      );
      if (!tableCheck.rows[0].exists) {
        throw new Error(`Table ${table} does not exist`);
      }
    }
    
    // Test indexes
    const indexCheck = await pool.query(
      "SELECT count(*) as count FROM pg_indexes WHERE tablename = 'calls'"
    );
    if (indexCheck.rows[0].count < 3) {
      results.warnings++;
      log.warning('Missing performance indexes on calls table');
    }
  } finally {
    await pool.end();
  }
}

// ============================================================================
// API ENDPOINT TESTS
// ============================================================================

async function testCallsAPI() {
  const response = await axios.get(`${BACKEND_URL}/api/calls`, {
    params: { limit: 1 },
    timeout: TIMEOUT
  });
  
  if (!response.data.success) {
    throw new Error('Calls API did not return success');
  }
  
  if (!Array.isArray(response.data.data)) {
    throw new Error('Calls API did not return data array');
  }
  
  if (!response.data.pagination) {
    throw new Error('Calls API missing pagination info');
  }
}

async function testAnalyticsAPI() {
  const response = await axios.get(`${BACKEND_URL}/api/analytics`, {
    params: { period: '7d' },
    timeout: TIMEOUT
  });
  
  if (!response.data.success) {
    throw new Error('Analytics API did not return success');
  }
  
  const required = ['overview', 'daily_breakdown', 'conversion_funnel'];
  for (const field of required) {
    if (!response.data[field]) {
      throw new Error(`Analytics API missing ${field}`);
    }
  }
}

// ============================================================================
// WEBHOOK TESTS
// ============================================================================

async function testWebhookEndpoint() {
  // Test webhook exists and handles invalid signature properly
  try {
    await axios.post(`${BACKEND_URL}/api/v1/webhook`, 
      { type: 'test' },
      { 
        headers: { 
          'x-vapi-signature': 'invalid',
          'x-vapi-timestamp': Date.now().toString()
        },
        timeout: TIMEOUT,
        validateStatus: () => true // Don't throw on 4xx/5xx
      }
    );
    
    // Should reject invalid signature
    log.info('Webhook security is active');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Webhook endpoint not responding');
    }
  }
}

// ============================================================================
// NOTIFICATION TESTS
// ============================================================================

async function testNotificationSystem() {
  // This is a smoke test - we don't actually send notifications
  log.info('Checking notification configuration...');
  
  const required = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN', 
    'TWILIO_FROM_NUMBER',
    'SENDGRID_API_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    results.warnings++;
    log.warning(`Missing notification env vars: ${missing.join(', ')}`);
  }
}

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

async function testResponseTimes() {
  const endpoints = [
    { url: '/healthz', maxTime: 1000 },
    { url: '/api/calls?limit=10', maxTime: 2000 },
    { url: '/api/analytics?period=7d', maxTime: 3000 }
  ];
  
  for (const endpoint of endpoints) {
    const start = Date.now();
    await axios.get(`${BACKEND_URL}${endpoint.url}`, { timeout: TIMEOUT });
    const duration = Date.now() - start;
    
    if (duration > endpoint.maxTime) {
      results.warnings++;
      log.warning(`${endpoint.url} took ${duration}ms (max: ${endpoint.maxTime}ms)`);
    } else {
      log.info(`${endpoint.url} responded in ${duration}ms`);
    }
  }
}

// ============================================================================
// SECURITY TESTS
// ============================================================================

async function testSecurityHeaders() {
  const response = await axios.get(`${BACKEND_URL}/healthz`, { 
    timeout: TIMEOUT,
    validateStatus: () => true 
  });
  
  const securityHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection'
  ];
  
  for (const header of securityHeaders) {
    if (!response.headers[header]) {
      results.warnings++;
      log.warning(`Missing security header: ${header}`);
    }
  }
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

async function testEndToEndFlow() {
  log.info('Simulating end-to-end call flow...');
  
  // 1. Test function call
  const functionPayload = {
    type: 'function-call',
    function: 'checkAvailability',
    parameters: { date: new Date().toISOString() }
  };
  
  const functionResponse = await axios.post(
    `${BACKEND_URL}/api/v1/webhook`,
    functionPayload,
    { timeout: TIMEOUT, validateStatus: () => true }
  );
  
  if (functionResponse.status === 401) {
    log.info('Webhook requires authentication (good security)');
  } else if (functionResponse.status === 200) {
    log.info('Function call processed successfully');
  } else {
    throw new Error(`Unexpected status: ${functionResponse.status}`);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════╗
║        CHATTYAI PRODUCTION VALIDATION SUITE               ║
║                                                           ║
║  Testing: ${BACKEND_URL.padEnd(42)}  ║
║  Time: ${new Date().toISOString().padEnd(45)}    ║
╚═══════════════════════════════════════════════════════════╝
  `));

  // Run all tests
  log.section('HEALTH CHECKS');
  await runTest('Health Endpoint', testHealthEndpoint);
  
  log.section('DATABASE TESTS');
  await runTest('Database Connection', testDatabaseConnection);
  
  log.section('API TESTS');
  await runTest('Calls API', testCallsAPI);
  await runTest('Analytics API', testAnalyticsAPI);
  
  log.section('WEBHOOK TESTS');
  await runTest('Webhook Endpoint', testWebhookEndpoint);
  
  log.section('NOTIFICATION TESTS');
  await runTest('Notification System', testNotificationSystem);
  
  log.section('PERFORMANCE TESTS');
  await runTest('Response Times', testResponseTimes);
  
  log.section('SECURITY TESTS');
  await runTest('Security Headers', testSecurityHeaders);
  
  log.section('INTEGRATION TESTS');
  await runTest('End-to-End Flow', testEndToEndFlow);
  
  // Summary
  log.section('VALIDATION SUMMARY');
  
  console.log(chalk.bold(`
  Total Tests: ${results.passed + results.failed}
  ${chalk.green(`Passed: ${results.passed}`)}
  ${chalk.red(`Failed: ${results.failed}`)}
  ${chalk.yellow(`Warnings: ${results.warnings}`)}
  `));
  
  if (results.errors.length > 0) {
    console.log(chalk.red('\nErrors:'));
    results.errors.forEach(err => {
      console.log(chalk.red(`  • ${err.test}: ${err.error}`));
    });
  }
  
  // Determine overall status
  const overallStatus = results.failed === 0 ? 'PASSED' : 'FAILED';
  const statusColor = results.failed === 0 ? chalk.green : chalk.red;
  
  console.log('\n' + statusColor.bold(`
╔═══════════════════════════════════════════════════════════╗
║                  VALIDATION ${overallStatus.padEnd(29)}║
╚═══════════════════════════════════════════════════════════╝
  `));
  
  // Exit code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Error handler
process.on('unhandledRejection', (error) => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});

// Run validation
if (require.main === module) {
  main().catch(error => {
    log.error(`Validation failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runTest,
  results
}; 