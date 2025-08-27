#!/usr/bin/env node

/**
 * Manual JWT Token Generation
 * Usage: node scripts/mint-jwt-manual.js <JWT_SECRET> <TENANT_ID> <API_KEY>
 */

const jwt = require('jsonwebtoken');

function mintJWT() {
  const args = process.argv.slice(2);
  
  if (args.length !== 3) {
    console.error('❌ Usage: node scripts/mint-jwt-manual.js <JWT_SECRET> <TENANT_ID> <API_KEY>');
    console.error('');
    console.error('💡 Get these values from:');
    console.error('   JWT_SECRET: Render → chattyai-calendar-bot-1 → Environment');
    console.error('   TENANT_ID: The UUID you use (check setup-tenant.js output)');
    console.error('   API_KEY: From tenants table or setup-tenant.js output');
    console.error('');
    console.error('Example:');
    console.error('   node scripts/mint-jwt-manual.js "your-jwt-secret" "uuid-here" "api-key-here"');
    process.exit(1);
  }
  
  const [jwtSecret, tenantId, apiKey] = args;
  
  try {
    // Generate JWT token
    const payload = {
      api_key: apiKey,
      tenant_id: tenantId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
    };
    
    const token = jwt.sign(payload, jwtSecret, { 
      algorithm: 'HS256',
      expiresIn: '30d'
    });
    
    console.log('🎉 Tenant JWT Token Generated Successfully!');
    console.log('=' .repeat(60));
    console.log(`Token: ${token}`);
    console.log('=' .repeat(60));
    console.log('\n📋 Token Details:');
    console.log(`   Algorithm: HS256`);
    console.log(`   Expires: 30 days`);
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   API Key: ${apiKey.substring(0, 8)}...`);
    console.log(`   Issued: ${new Date().toISOString()}`);
    console.log(`   Expires: ${new Date(payload.exp * 1000).toISOString()}`);
    
    console.log('\n💡 Next Steps:');
    console.log('1. Copy the token above');
    console.log('2. Go to Render → chattyai-backend-clean → Environment');
    console.log('3. Add: TENANT_JWT=<paste-token-here>');
    console.log('4. Save → Manual Redeploy');
    console.log('5. Test with: curl -H "X-Debug-Key: $KEY" "$API/debug/calendar"');
    
  } catch (error) {
    console.error('❌ Error generating JWT:', error.message);
    if (error.message.includes('secretOrPrivateKey')) {
      console.log('💡 Check that JWT_SECRET is correct');
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  mintJWT();
}

module.exports = { mintJWT };
