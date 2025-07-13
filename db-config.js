const knex = require('knex');
const { types } = require('pg');

// Fix for BigInt parsing (common issue with Render PostgreSQL)
types.setTypeParser(20, (val) => parseInt(val, 10));

// Create database connection with proper pooling
const createDbConnection = () => {
  const config = {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'chattyai'
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      afterCreate: function (conn, done) {
        // Set up RLS context for tenant isolation
        conn.query('SET app.tenant_id = $1', [process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000000'], function (err) {
          if (err) {
            console.warn('Failed to set tenant context:', err);
          }
          done(err, conn);
        });
      },
    },
    migrations: { 
      directory: './migrations',
      tableName: 'knex_migrations'
    },
    acquireConnectionTimeout: 30000,
    // Prevent connection timeout errors
    asyncStackTraces: process.env.NODE_ENV !== 'production',
    debug: process.env.DEBUG_SQL === 'true'
  };

  // Add SSL config for production (Render requires this)
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    config.connection = {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    };
  }

  const db = knex(config);

  // Test connection on startup
  db.raw('SELECT 1')
    .then(() => {
      console.log('✅ Database connected successfully');
    })
    .catch((err) => {
      console.error('❌ Database connection failed:', err.message);
      console.error('Make sure DATABASE_URL is set correctly');
    });

  // Handle connection errors gracefully
  db.on('error', (err) => {
    console.error('Database error:', err);
  });

  return db;
};

// Export singleton instance
let dbInstance = null;

const getDb = () => {
  if (!dbInstance) {
    dbInstance = createDbConnection();
  }
  return dbInstance;
};

// Graceful shutdown
process.on('SIGINT', async () => {
  if (dbInstance) {
    await dbInstance.destroy();
    console.log('Database connection closed');
  }
  process.exit(0);
});

module.exports = { getDb, createDbConnection }; 