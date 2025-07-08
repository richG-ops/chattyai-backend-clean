# Add Tenant to Render Database

## Option 1: Use Render Shell (Recommended)

1. Go to https://dashboard.render.com
2. Click on `chattyai-calendar-bot-1`
3. Click "Shell" tab
4. Run these commands:

```bash
# Create credentials file
cat > /tmp/credentials.json << 'EOF'
{"web":{"client_id":"372700915954-mrjrbeais0kkorg5iufh7bnafbraqe82.apps.googleusercontent.com","project_id":"balmy-nuance-452201-h2","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"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","redirect_uris":["http://localhost:4000/auth/google/callback","https://chattyai-calendar-bot-1.onrender.com/auth/google/callback"]}}
EOF

# Create token file
cat > /tmp/token.json << 'EOF'
{"access_token":"ya29.a0AS3H6NzmXrMBzi_OU1eRFAG2x0cYft8mosmylKADXhjkjRLky-35WRT3nDHm_5W1naAM9XxqDyJFy4_Ze5OeTpnkGZKwCsvkD2J0FjfC5ncj9SOD_ulCbCAyIDwKWeJCKdOAW3QGxwrtAdDqiPICEMYW5dkUbOTBuigkda00aCgYKAQwSARISFQHGX2MiUYLAC-dY8hIWMF5tERwEoQ0175","refresh_token":"1//06kO2gHZ9vz4fCgYIARAAGAYSNwF-L9IroyOOw5aj_3NaxPaNdgGDWCVC4N8kLDbNj6Tnwh80J0mKzP6Jy8WUezDvKFOL5FkDWWc","scope":"https://www.googleapis.com/auth/calendar","token_type":"Bearer","expiry_date":1752010155516}
EOF

# Add tenant
node scripts/addTenant.js "My Calendar" /tmp/credentials.json /tmp/token.json
```

5. Copy the JWT token that's displayed
6. Use that JWT token for API calls

## Option 2: Create a One-Time Script

Create `setup-tenant.js` in your project:

```javascript
const knex = require('knex')(require('./knexfile').production);
const crypto = require('crypto');

async function setupTenant() {
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
  
  console.log('✅ Tenant created!');
  console.log('JWT Token:', jwtToken);
  
  await knex.destroy();
}

setupTenant().catch(console.error);
```

Then commit, push, and run it once on Render. 