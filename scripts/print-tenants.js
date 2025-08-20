#!/usr/bin/env node

/**
 * Print tenants from database
 * Usage: npm run tenants:print
 */

const { Client } = require('pg');

(async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable not set');
      console.log('💡 Set it with: $env:DATABASE_URL="<COPY from calendar-bot Render env>"');
      process.exit(1);
    }

    console.log('🔍 Connecting to database...');
    const client = new Client({ 
      connectionString: process.env.DATABASE_URL, 
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log('✅ Connected to database');
    
    const { rows } = await client.query('SELECT id, api_key FROM tenants ORDER BY created_at DESC LIMIT 5');
    
    if (rows.length === 0) {
      console.log('❌ No tenants found in database');
      console.log('💡 Run setup-tenant.js first to create a tenant');
    } else {
      console.log('📋 Recent tenants:');
      console.log(JSON.stringify(rows, null, 2));
      console.log('');
      console.log('💡 Copy one pair: id + api_key from above');
      console.log('🚀 Then run: npm run mint:jwt -- "<TENANT_ID>" "<API_KEY>"');
    }
    
    await client.end();
    
  } catch (error) {
    console.error('❌ print-tenants failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Check that DATABASE_URL is correct and database is accessible');
    }
    process.exit(1);
  }
})();
