const { google } = require('googleapis');
const fs = require('fs');
const express = require('express');
const open = require('open');

const app = express();

console.log('🔍 OAuth Diagnostic Tool\n');

// Load credentials
const credentials = JSON.parse(fs.readFileSync('credentials.json'));
console.log('✅ Loaded credentials.json');

const { client_id, client_secret, redirect_uris } = credentials.web;

console.log('\n📋 Credential Details:');
console.log(`Client ID: ${client_id.substring(0, 40)}...`);
console.log(`Client Secret: ${client_secret.substring(0, 10)}...`);
console.log(`Redirect URIs:`);
redirect_uris.forEach(uri => console.log(`  - ${uri}`));

// Use the localhost redirect URI
const REDIRECT_URI = 'http://localhost:4000/auth/google/callback';
console.log(`\n🎯 Using redirect URI: ${REDIRECT_URI}`);

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  REDIRECT_URI
);

app.get('/start', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent'
  });
  
  console.log('\n🔗 Generated auth URL:', authUrl);
  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    console.error('\n❌ OAuth Error:', error);
    res.send(`Error: ${error}`);
    return;
  }
  
  if (!code) {
    console.error('\n❌ No authorization code received');
    res.send('Error: No authorization code');
    return;
  }
  
  console.log('\n✅ Received authorization code:', code.substring(0, 20) + '...');
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n🎉 Successfully got tokens!');
    console.log('Token data:', JSON.stringify(tokens, null, 2));
    
    // Save to token.json
    fs.writeFileSync('token.json', JSON.stringify(tokens, null, 2));
    console.log('\n💾 Saved to token.json');
    
    res.send(`
      <h1>✅ Authentication Successful!</h1>
      <p>Token saved to token.json</p>
      <p>You can close this window.</p>
      <pre>${JSON.stringify(tokens, null, 2)}</pre>
    `);
    
    setTimeout(() => {
      console.log('\n👋 Shutting down server...');
      process.exit(0);
    }, 2000);
  } catch (error) {
    console.error('\n❌ Token exchange error:', error.message);
    console.error('Full error:', error);
    res.send(`Error: ${error.message}`);
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log('\n📱 Opening browser to start authentication...');
  open(`http://localhost:${PORT}/start`);
}); 