const knex = require('knex')(require('./knexfile').production);
const crypto = require('crypto');

async function setupTenant() {
  try {
    // Check if tenant already exists
    const existing = await knex('tenants').first();
    if (existing) {
      console.log('ℹ️  Tenant already exists');
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ api_key: existing.api_key }, process.env.JWT_SECRET, { expiresIn: '365d' });
      console.log('Your JWT Token:', token);
      await knex.destroy();
      return;
    }

    const api_key = crypto.randomBytes(16).toString('hex');
    
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const token = JSON.parse(process.env.GOOGLE_TOKEN);
    
    await knex('tenants').insert({
      name: 'My Calendar',
      api_key,
      g_credentials: credentials,
      g_token: token
    });
    
    const jwt = require('jsonwebtoken');
    const jwtToken = jwt.sign({ api_key }, process.env.JWT_SECRET, { expiresIn: '365d' });
    
    console.log('✅ Tenant created successfully!');
    console.log('');
    console.log('🔑 Your JWT Token:');
    console.log(jwtToken);
    console.log('');
    console.log('📋 Test your API with:');
    console.log(`curl -H "Authorization: Bearer ${jwtToken}" https://chattyai-calendar-bot-1.onrender.com/get-availability`);
    
    await knex.destroy();
  } catch (error) {
    console.error('Error:', error);
    await knex.destroy();
    process.exit(1);
  }
}

setupTenant(); 