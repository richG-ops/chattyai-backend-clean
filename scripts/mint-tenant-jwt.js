#!/usr/bin/env node

/**
 * Mint tenant JWT token
 * Usage: npm run mint:jwt -- "<TENANT_ID>" "<API_KEY>" [expDays=30]
 */

const jwt = require('jsonwebtoken');

const [,, tenantId, apiKey, expDays = '30'] = process.argv;

if (!tenantId || !apiKey || !process.env.JWT_SECRET) {
  console.error('❌ Missing required parameters');
  console.error('');
  console.error('💡 Usage: npm run mint:jwt -- "<TENANT_ID>" "<API_KEY>" [expDays]');
  console.error('   (needs JWT_SECRET in env)');
  console.error('');
  console.error('Example:');
  console.error('   npm run mint:jwt -- "550e8400-e29b-41d4-a716-446655440000" "abc123def456" 30');
  console.error('');
  console.error('🔍 Make sure you have:');
  console.error('   • JWT_SECRET environment variable set');
  console.error('   • Valid TENANT_ID and API_KEY');
  console.error('');
  console.error('💡 Get values with: npm run tenants:print');
  process.exit(1);
}

try {
  console.log('🔑 Minting tenant JWT token...');
  console.log(`📋 Tenant ID: ${tenantId}`);
  console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`⏰ Expires: ${expDays} days`);
  console.log('');
  
  const token = jwt.sign(
    { api_key: apiKey, tenant_id: tenantId }, 
    process.env.JWT_SECRET, 
    { algorithm: 'HS256', expiresIn: `${expDays}d` }
  );
  
  console.log('🎉 JWT Token Generated Successfully!');
  console.log('=' .repeat(60));
  console.log(token);
  console.log('=' .repeat(60));
  console.log('');
  console.log('📝 Next Steps:');
  console.log('1. Copy the token above');
  console.log('2. Go to Render → chattyai-backend-clean → Environment');
  console.log('3. Add: TENANT_JWT=<paste-token-here>');
  console.log('4. Save → Manual Redeploy');
  console.log('5. Test with: curl -H "X-Debug-Key: $KEY" "$API/debug/calendar"');
  console.log('');
  console.log('✅ Expected: "availability": { "status": 200 }');
  
} catch (error) {
  console.error('❌ Error generating JWT:', error.message);
  if (error.message.includes('secretOrPrivateKey')) {
    console.log('💡 Check that JWT_SECRET is correct');
  }
  process.exit(1);
}
