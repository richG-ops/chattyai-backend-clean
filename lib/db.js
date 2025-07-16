/**
 * ============================================================================
 * UNIFIED DATABASE CONNECTION MODULE
 * ============================================================================
 * Author: Prof. Hale Architecture Team
 * Purpose: Single source of truth for database connections
 * Features: Connection pooling, migration support, multi-tenant context
 * ============================================================================
 */

const knex = require('knex');

// Configuration for production-grade connection pool
const dbConfig = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { 
    min: 2, 
    max: 20,
    createTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100
  },
  migrations: { 
    directory: './migrations',
    extension: 'js'
  },
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  acquireConnectionTimeout: 60000,
  debug: process.env.NODE_ENV === 'development'
};

// Create single knex instance
const db = knex(dbConfig);

// Set tenant context for Row Level Security
db.setTenantContext = async (businessId = process.env.DEFAULT_TENANT_ID) => {
  if (businessId) {
    await db.raw('SET app.current_business_id = ?', [businessId]);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Closing database connections...');
  await db.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Closing database connections...');
  await db.destroy();
  process.exit(0);
});

// Connection health check
db.healthCheck = async () => {
  try {
    await db.raw('SELECT 1');
    return { status: 'healthy', connections: db.client.pool.numUsed() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

// Validation at startup
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

console.log('✅ Database connection initialized with knex');

module.exports = db; 