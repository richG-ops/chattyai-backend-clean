/**
 * ============================================================================
 * ENVIRONMENT VALIDATION MODULE
 * ============================================================================
 * Author: Prof. Hale Architecture Team
 * Purpose: Validate environment variables at startup
 * Features: Graceful fallbacks, dev/prod parity, clear error messages
 * ============================================================================
 */

/**
 * Required environment variables for core functionality
 */
const REQUIRED_VARS = {
  DATABASE_URL: 'PostgreSQL connection string',
  DEFAULT_TENANT_ID: 'Default business/tenant UUID'
};

/**
 * Optional environment variables with fallbacks
 */
const OPTIONAL_VARS = {
  VAPI_WEBHOOK_SECRET: 'VAPI webhook signature validation',
  TWILIO_ACCOUNT_SID: 'SMS notifications via Twilio',
  TWILIO_AUTH_TOKEN: 'SMS notifications via Twilio',
  TWILIO_FROM_NUMBER: 'SMS sender number',
  SENDGRID_API_KEY: 'Email notifications via SendGrid',
  FROM_EMAIL: 'Email sender address',
  OWNER_PHONE: 'Business owner phone for notifications',
  OWNER_EMAIL: 'Business owner email for notifications',
  SENTRY_DSN: 'Error monitoring',
  NODE_ENV: 'Environment (development/production)',
  PORT: 'Server port'
};

/**
 * Default values for development
 */
const DEFAULTS = {
  DEFAULT_TENANT_ID: '00000000-0000-0000-0000-000000000000',
  OWNER_PHONE: '+17027760084',
  OWNER_EMAIL: 'richard.gallagherxyz@gmail.com',
  FROM_EMAIL: 'no-reply@chattyai.com',
  NODE_ENV: 'development',
  PORT: '8080'
};

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const errors = [];
  const warnings = [];
  
  console.log('🔍 Validating environment variables...');
  
  // Check required variables
  for (const [varName, description] of Object.entries(REQUIRED_VARS)) {
    if (!process.env[varName]) {
      errors.push(`❌ ${varName} is required: ${description}`);
    } else {
      console.log(`✅ ${varName}: configured`);
    }
  }
  
  // Check optional variables and set defaults
  for (const [varName, description] of Object.entries(OPTIONAL_VARS)) {
    if (!process.env[varName]) {
      if (DEFAULTS[varName]) {
        process.env[varName] = DEFAULTS[varName];
        console.log(`⚙️ ${varName}: using default (${DEFAULTS[varName]})`);
      } else {
        warnings.push(`⚠️ ${varName} not set: ${description} will be disabled`);
      }
    } else {
      console.log(`✅ ${varName}: configured`);
    }
  }
  
  // Validate specific formats
  validateFormats(errors, warnings);
  
  // Print warnings
  if (warnings.length > 0) {
    console.log('\n🟡 WARNINGS:');
    warnings.forEach(warning => console.log(warning));
  }
  
  // Handle errors
  if (errors.length > 0) {
    console.error('\n🔴 FATAL ERRORS:');
    errors.forEach(error => console.error(error));
    console.error('\nPlease fix the above errors before starting the application.');
    process.exit(1);
  }
  
  console.log('\n✅ Environment validation passed!');
  return true;
}

/**
 * Validate specific environment variable formats
 */
function validateFormats(errors, warnings) {
  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL) {
    if (!process.env.DATABASE_URL.startsWith('postgres://') && 
        !process.env.DATABASE_URL.startsWith('postgresql://')) {
      errors.push('❌ DATABASE_URL must be a valid PostgreSQL connection string');
    }
  }
  
  // Validate DEFAULT_TENANT_ID is a UUID
  if (process.env.DEFAULT_TENANT_ID) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(process.env.DEFAULT_TENANT_ID)) {
      errors.push('❌ DEFAULT_TENANT_ID must be a valid UUID');
    }
  }
  
  // Validate phone numbers
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (process.env.OWNER_PHONE && !phoneRegex.test(process.env.OWNER_PHONE)) {
    warnings.push('⚠️ OWNER_PHONE should be in E.164 format (+1234567890)');
  }
  
  if (process.env.TWILIO_FROM_NUMBER && !phoneRegex.test(process.env.TWILIO_FROM_NUMBER)) {
    warnings.push('⚠️ TWILIO_FROM_NUMBER should be in E.164 format (+1234567890)');
  }
  
  // Validate email addresses
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (process.env.OWNER_EMAIL && !emailRegex.test(process.env.OWNER_EMAIL)) {
    warnings.push('⚠️ OWNER_EMAIL should be a valid email address');
  }
  
  if (process.env.FROM_EMAIL && !emailRegex.test(process.env.FROM_EMAIL)) {
    warnings.push('⚠️ FROM_EMAIL should be a valid email address');
  }
  
  // Check Twilio configuration completeness
  const twilioVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'];
  const twilioConfigured = twilioVars.filter(varName => process.env[varName]).length;
  
  if (twilioConfigured > 0 && twilioConfigured < twilioVars.length) {
    warnings.push('⚠️ Partial Twilio configuration - SMS may not work');
  }
  
  // Validate NODE_ENV
  if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    warnings.push('⚠️ NODE_ENV should be development, production, or test');
  }
  
  // Validate PORT
  if (process.env.PORT && (isNaN(process.env.PORT) || process.env.PORT < 1 || process.env.PORT > 65535)) {
    warnings.push('⚠️ PORT should be a number between 1 and 65535');
  }
}

/**
 * Get configuration summary for logging
 */
function getConfigSummary() {
  return {
    environment: process.env.NODE_ENV,
    port: process.env.PORT,
    database: process.env.DATABASE_URL ? 'configured' : 'missing',
    defaultTenant: process.env.DEFAULT_TENANT_ID,
    notifications: {
      sms: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      email: !!process.env.SENDGRID_API_KEY,
      webhook: !!process.env.VAPI_WEBHOOK_SECRET
    },
    monitoring: !!process.env.SENTRY_DSN
  };
}

module.exports = {
  validateEnvironment,
  getConfigSummary,
  REQUIRED_VARS,
  OPTIONAL_VARS,
  DEFAULTS
}; 