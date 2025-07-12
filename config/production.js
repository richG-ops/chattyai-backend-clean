/**
 * Production Configuration
 * Validates and centralizes all environment variables
 * Follows world-class configuration management practices
 */

const requiredEnvVars = [
  'JWT_SECRET',
  'PORT'
];

const optionalEnvVars = {
  NODE_ENV: 'production',
  LOG_LEVEL: 'info',
  RATE_LIMIT_WINDOW_MS: '900000',
  RATE_LIMIT_MAX_REQUESTS: '100',
  ALLOWED_ORIGINS: 'https://app.thechattyai.com,https://thechattyai.com'
};

// Validate required environment variables
function validateEnvironment() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n📖 See deployment documentation for setup instructions');
    
    // In production, continue with warnings rather than crashing
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Service starting with missing configuration - some features may be disabled');
    } else {
      process.exit(1);
    }
  }
}

// Load and validate configuration
validateEnvironment();

module.exports = {
  // Core settings
  environment: process.env.NODE_ENV || 'production',
  port: parseInt(process.env.PORT) || 4000,
  
  // Security
  jwtSecret: process.env.JWT_SECRET || 'insecure-default-change-immediately',
  
  // Google Calendar
  google: {
    credentials: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS) : null,
    token: process.env.GOOGLE_TOKEN ? JSON.parse(process.env.GOOGLE_TOKEN) : null,
    enabled: !!(process.env.GOOGLE_CREDENTIALS && process.env.GOOGLE_TOKEN)
  },
  
  // Database
  database: {
    url: process.env.DATABASE_URL,
    enabled: !!process.env.DATABASE_URL
  },
  
  // External services
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
    enabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  },
  
  vapi: {
    apiKey: process.env.VAPI_API_KEY,
    enabled: !!process.env.VAPI_API_KEY
  },
  
  // Monitoring
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  
  // Performance
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  // CORS
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
    credentials: true
  },
  
  // Health check information
  getStatus() {
    return {
      environment: this.environment,
      features: {
        google_calendar: this.google.enabled,
        database: this.database.enabled,
        twilio: this.twilio.enabled,
        vapi: this.vapi.enabled,
        monitoring: !!this.monitoring.sentryDsn
      },
      security: {
        jwt_configured: this.jwtSecret !== 'insecure-default-change-immediately',
        cors_configured: this.cors.allowedOrigins.length > 0
      }
    };
  }
}; 