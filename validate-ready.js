#!/usr/bin/env node

console.log('🔍 Production Readiness Check\n');

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function check(name, condition, fix = '') {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    if (fix) console.log(`   Fix: ${fix}`);
    failed++;
  }
}

// Check files exist
console.log('📁 File Checks:');
check('Idempotency middleware exists', fs.existsSync('middleware/idempotency.js'));
check('Rate limiter exists', fs.existsSync('utils/twilio-limiter.js'));
check('Migration exists', fs.existsSync('migrations/20250116_add_processed_webhooks.js'));
check('Cleanup script exists', fs.existsSync('scripts/cleanup-webhooks.js'));

// Check package.json dependencies
console.log('\n📦 Dependencies:');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
check('Luxon installed', pkg.dependencies['luxon']);
check('Bottleneck installed', pkg.dependencies['bottleneck']);
check('Sentry installed', pkg.dependencies['@sentry/node']);

// Check code modifications
console.log('\n🔧 Code Modifications:');
const mainFile = fs.readFileSync('google-calendar-api.js', 'utf8');
check('Luxon imported', mainFile.includes("require('luxon')"));
check('Sentry initialized', mainFile.includes('Sentry.init'));
check('Idempotency middleware applied', mainFile.includes('idempotencyMiddleware'));
check('Rate limiter imported', mainFile.includes('./utils/twilio-limiter'));

// Check critical functions
console.log('\n⚡ Function Updates:');
check('parseNaturalDate uses Luxon', mainFile.includes('DateTime.now().setZone'));
check('SMS uses rate limiter', mainFile.includes('twilioLimiter.schedule'));
check('Email uses rate limiter', mainFile.includes('emailLimiter.schedule'));

// Summary
console.log('\n📊 Summary:');
console.log(`Passed: ${passed}/${passed + failed}`);

if (failed === 0) {
  console.log('\n✅ Ready for production deployment!');
  console.log('\nNext steps:');
  console.log('1. git add -A && git commit -m "feat: P0 critical fixes"');
  console.log('2. git push origin main');
  console.log('3. Add SENTRY_DSN to Render env vars');
  console.log('4. Run migration on prod database');
  console.log('5. Update Vapi webhook URL to /vapi-webhook');
} else {
  console.log('\n⚠️  Fix the issues above before deploying');
} 