const https = require('https');
const querystring = require('querystring');

console.log('🔍 Testing Google OAuth Credentials...\n');

// Your credentials
const CLIENT_ID = '372700915954-mrjrbeais0kkorg5iufh7bnafbraqe82.apps.googleusercontent.com';
const CLIENT_SECRET = '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';

// Test by making a direct OAuth URL
const params = {
  client_id: CLIENT_ID,
  redirect_uri: 'http://localhost:4000/auth/google/callback',
  response_type: 'code',
  scope: 'https://www.googleapis.com/auth/calendar',
  access_type: 'offline',
  prompt: 'consent'
};

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${querystring.stringify(params)}`;

console.log('📋 OAuth URL Components:');
console.log(`Client ID: ${CLIENT_ID}`);
console.log(`Redirect URI: ${params.redirect_uri}`);
console.log(`\n✅ If credentials are valid, this URL should work:`);
console.log(authUrl);

console.log('\n⚠️  IMPORTANT: The "invalid_client" error usually means:');
console.log('1. Your OAuth client was deleted in Google Cloud Console');
console.log('2. The OAuth consent screen is not configured');
console.log('3. The client is disabled or suspended');

console.log('\n🔧 TO FIX THIS:');
console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
console.log('2. Select your project: "balmy-nuance-452201-h2"');
console.log('3. Check if your OAuth 2.0 Client ID exists and is enabled');
console.log('4. If missing, create a new OAuth 2.0 Client ID:');
console.log('   - Application type: Web application');
console.log('   - Add authorized redirect URIs:');
console.log('     • http://localhost:4000/auth/google/callback');
console.log('     • https://chattyai-calendar-bot-1.onrender.com/auth/google/callback');
console.log('5. Download the new credentials JSON and replace your current one'); 