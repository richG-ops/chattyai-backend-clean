#!/usr/bin/env node

/**
 * Print masked configuration information
 * Shows branch and presence of critical environment variables
 */

const { execSync } = require('child_process');
const path = require('path');

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

function logSection(title) {
  log(`\n${title}`, 'bright');
  log('─'.repeat(title.length), 'blue');
}

function logConfig(key, value, status = 'info') {
  const statusColor = status === 'ok' ? 'green' : status === 'warn' ? 'yellow' : status === 'error' ? 'red' : 'blue';
  const statusSymbol = status === 'ok' ? '✅' : status === 'warn' ? '⚠️' : status === 'error' ? '❌' : 'ℹ️';
  log(`${statusSymbol} ${key}: ${value}`, statusColor);
}

function getGitBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { 
      cwd: __dirname,
      encoding: 'utf8' 
    }).trim();
    return branch;
  } catch (error) {
    return 'unknown';
  }
}

function getGitCommit() {
  try {
    const commit = execSync('git rev-parse --short HEAD', { 
      cwd: __dirname,
      encoding: 'utf8' 
    }).trim();
    return commit;
  } catch (error) {
    return 'unknown';
  }
}

function getGitStatus() {
  try {
    const status = execSync('git status --porcelain', { 
      cwd: __dirname,
      encoding: 'utf8' 
    }).trim();
    return status ? 'dirty' : 'clean';
  } catch (error) {
    return 'unknown';
  }
}

function checkEnvironmentVariable(key, description, critical = false) {
  const value = process.env[key];
  if (value) {
    const maskedValue = value.length > 8 ? 
      `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : 
      '***';
    logConfig(key, `${maskedValue} (${value.length} chars)`, 'ok');
    return true;
  } else {
    const status = critical ? 'error' : 'warn';
    logConfig(key, 'NOT SET', status);
    return false;
  }
}

function printConfig() {
  log('🔧 Configuration Summary', 'bright');
  log(`📅 Generated: ${new Date().toISOString()}`, 'blue');
  
  // Git Information
  logSection('Git Repository');
  const branch = getGitBranch();
  const commit = getGitCommit();
  const gitStatus = getGitStatus();
  
  logConfig('Branch', branch, branch === 'main' ? 'ok' : 'warn');
  logConfig('Commit', commit, 'info');
  logConfig('Status', gitStatus, gitStatus === 'clean' ? 'ok' : 'warn');
  
  // Environment Information
  logSection('Environment');
  logConfig('NODE_ENV', process.env.NODE_ENV || 'development', 'info');
  logConfig('PORT', process.env.PORT || '3000', 'info');
  
  // Critical Calendar Configuration
  logSection('Calendar Configuration (Critical)');
  const provider = (process.env.CALENDAR_PROVIDER || process.env.CAL_PROVIDER || process.env.PROVIDER || 'legacy');
  logConfig('CALENDAR_PROVIDER', provider, 'info');
  if ((provider || '').toLowerCase() === 'calcom') {
    const calBase = checkEnvironmentVariable('CAL_API_BASE', 'Cal.com API Base', false);
    const calKey = checkEnvironmentVariable('CAL_API_KEY', 'Cal.com API Key', true);
    const calEvent = checkEnvironmentVariable('CAL_EVENT_TYPE_ID', 'Cal.com Event Type Id', true);
  } else {
    const calendarUrl = checkEnvironmentVariable('CALENDAR_API_URL', 'Calendar API URL', true);
    const calendarJwt = checkEnvironmentVariable('TENANT_JWT', 'Tenant JWT Token', false);
  }
  const calendarTz = checkEnvironmentVariable('TENANT_TZ', 'Tenant Timezone', false);
  
  // Database Configuration
  logSection('Database Configuration');
  const databaseUrl = checkEnvironmentVariable('DATABASE_URL', 'Database URL', true);
  
  // Redis Configuration
  logSection('Redis Configuration');
  const redisUrl = checkEnvironmentVariable('REDIS_URL', 'Redis URL', false);
  const queueRedisUrl = checkEnvironmentVariable('QUEUE_REDIS_URL', 'Queue Redis URL', false);
  const bullRedisUrl = checkEnvironmentVariable('BULL_REDIS_URL', 'Bull Redis URL', false);
  
  // External Services
  logSection('External Services');
  const twilioSid = checkEnvironmentVariable('TWILIO_ACCOUNT_SID', 'Twilio Account SID', false);
  const twilioToken = checkEnvironmentVariable('TWILIO_AUTH_TOKEN', 'Twilio Auth Token', false);
  const openaiKey = checkEnvironmentVariable('OPENAI_API_KEY', 'OpenAI API Key', false);
  const sendgridKey = checkEnvironmentVariable('SENDGRID_API_KEY', 'SendGrid API Key', false);
  
  // Security & Monitoring
  logSection('Security & Monitoring');
  const jwtSecret = checkEnvironmentVariable('JWT_SECRET', 'JWT Secret', false);
  const sentryDsn = checkEnvironmentVariable('SENTRY_DSN', 'Sentry DSN', false);
  const debugKey = checkEnvironmentVariable('DEBUG_API_KEY', 'Debug API Key', false);
  
  // Summary
  logSection('Configuration Summary');
  const criticalVars = ((provider || '').toLowerCase() === 'calcom')
    ? ['CAL_API_KEY', 'CAL_EVENT_TYPE_ID', 'DATABASE_URL']
    : ['CALENDAR_API_URL', 'DATABASE_URL'];
  const criticalCount = criticalVars.filter(key => !!process.env[key]).length;
  const totalCritical = criticalVars.length;
  
  if (criticalCount === totalCritical) {
    logConfig('Critical Variables', `${criticalCount}/${totalCritical} SET`, 'ok');
  } else {
    logConfig('Critical Variables', `${criticalCount}/${totalCritical} SET`, 'error');
  }
  
  const optionalVars = [
    'TENANT_JWT', 'TENANT_TZ', 'REDIS_URL', 'TWILIO_ACCOUNT_SID', 
    'TWILIO_AUTH_TOKEN', 'OPENAI_API_KEY', 'SENDGRID_API_KEY', 
    'JWT_SECRET', 'SENTRY_DSN', 'DEBUG_API_KEY'
  ];
  const optionalCount = optionalVars.filter(key => !!process.env[key]).length;
  const totalOptional = optionalVars.length;
  
  logConfig('Optional Variables', `${optionalCount}/${totalOptional} SET`, 'info');
  
  // Recommendations
  logSection('Recommendations');
  if (!process.env.CALENDAR_API_URL) {
    log('❌ Set CALENDAR_API_URL for calendar functionality', 'red');
  }
  if (!process.env.DATABASE_URL) {
    log('❌ Set DATABASE_URL for database connectivity', 'red');
  }
  if (!process.env.TENANT_JWT && !process.env.CALENDAR_JWT) {
    log('⚠️  Consider setting TENANT_JWT for authenticated calendar access', 'yellow');
  }
  if (!process.env.REDIS_URL) {
    log('⚠️  Consider setting REDIS_URL for caching and job queues', 'yellow');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    log('⚠️  Set JWT_SECRET in production for security', 'yellow');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.SENTRY_DSN) {
    log('⚠️  Consider setting SENTRY_DSN for production monitoring', 'yellow');
  }
  
  log('\n✨ Configuration check complete!', 'bright');
}

// Run if called directly
if (require.main === module) {
  printConfig();
}

module.exports = { printConfig };
