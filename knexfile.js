require('dotenv').config();

module.exports = {
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
  },
  migrations: { 
    directory: './migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './seeds'
  }
};

// Add SSL for production
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  module.exports.connection = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  };
} 