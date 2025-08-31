#!/usr/bin/env node

/**
 * Mint Tenant JWT Token
 * Reads JWT_SECRET and tenant API_KEY from database and signs a token
 */

const jwt = require('jsonwebtoken');
const { Client } = require('pg');

async function mintTenantJWT() {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    const defaultTenantId = process.env.DEFAULT_TENANT_ID;
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET environment variable not set');
      process.exit(1);
    }
    if (!defaultTenantId) {
      console.error('❌ DEFAULT_TENANT_ID environment variable not set');
      process.exit(1);
    }
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL environment variable not set');
      process.exit(1);
    }
    
    console.log('🔑 Minting tenant JWT token...');
    console.log(`📋 Tenant ID: ${defaultTenantId}`);
    console.log(`🔐 JWT Secret: ${jwtSecret.substring(0, 8)}...${jwtSecret.substring(jwtSecret.length - 8)}`);
    
    const client = new Client({ 
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    console.log('✅ Connected to database');
    
    const tenantQuery = `
      SELECT api_key, name, created_at 
      FROM tenants 
      WHERE id = $1
    `;
    const tenantResult = await client.query(tenantQuery, [defaultTenantId]);
    if (tenantResult.rows.length === 0) {
      console.error(`❌ Tenant with ID ${defaultTenantId} not found in database`);
      const allTenants = await client.query('SELECT id, name, api_key FROM tenants LIMIT 10');
      allTenants.rows.forEach(tenant => {
        console.log(`   ${tenant.id} - ${tenant.name} (${tenant.api_key ? 'API key set' : 'NO API key'})`);
      });
      await client.end();
      process.exit(1);
    }
    
    const tenant = tenantResult.rows[0];
    console.log(`✅ Found tenant: ${tenant.name}`);
    console.log(`🔑 API Key: ${tenant.api_key ? tenant.api_key.substring(0, 8) + '...' : 'NOT SET'}`);
    if (!tenant.api_key) {
      console.error('❌ Tenant has no API key set');
      console.log('💡 Set the api_key in the tenants table first');
      await client.end();
      process.exit(1);
    }
    
    const payload = {
      api_key: tenant.api_key,
      tenant_id: defaultTenantId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
    };
    const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256', expiresIn: '30d' });
    
    console.log('\n🎉 Tenant JWT Token Generated Successfully!');
    console.log('='.repeat(60));
    console.log(`Token: ${token}`);
    console.log('='.repeat(60));
    console.log('\n📋 Next Steps:');
    console.log('1. Copy the token above');
    console.log('2. Go to Render → chattyai-backend-clean → Environment');
    console.log('3. Add: TENANT_JWT=<paste-token-here>');
    console.log('4. Save → Manual Redeploy');
    console.log('5. Test with: curl -H "X-Debug-Key: $KEY" "$API/debug/calendar"');
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Error minting tenant JWT:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Check that DATABASE_URL is correct and database is accessible');
    }
    process.exit(1);
  }
}

if (require.main === module) {
  mintTenantJWT().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { mintTenantJWT };
