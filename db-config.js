// db-config.js - Unified Database Connection (Knex)
const knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { 
    min: 2, 
    max: 20, // Scale for 1000+ clients
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 600000
  },
  migrations: { 
    tableName: 'knex_migrations',
    directory: './migrations'
  },
  seeds: {
    directory: './seeds'
  }
});

// Health check function
async function checkConnection() {
  try {
    await knex.raw('SELECT 1');
    console.log('✅ Database connection verified');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Export both knex instance and helper
module.exports = knex;
module.exports.checkConnection = checkConnection; 