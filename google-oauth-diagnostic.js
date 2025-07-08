const fs = require('fs');
const { google } = require('googleapis');
const express = require('express');
const app = express();

const CREDENTIALS_PATH = 'credentials.json';
const TOKEN_PATH = 'token.json';
const PORT = 4000;

// --- 1. Load and validate credentials ---
let credentials;
try {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error('credentials.json not found!');
  }
  credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  if (!credentials.web) throw new Error('Missing "web" key in credentials.json');
  const { client_id, client_secret, redirect_uris } = credentials.web;
  if (!client_id || !client_secret) throw new Error('Missing client_id or client_secret in credentials.json');
  if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) throw new Error('No redirect_uris in credentials.json');
  console.log('✅ Credentials loaded:');
  console.log('   client_id:', client_id);
  console.log('   client_secret:', client_secret.slice(0, 6) + '...');
  console.log('   redirect_uris:', redirect_uris);
} catch (err) {
  console.error('❌ Error loading credentials:', err.message);
  process.exit(1);
}

// --- 2. Construct OAuth2 client with explicit redirect URI ---
const { client_id, client_secret, redirect_uris } = credentials.web;
const redirectUri = redirect_uris.find(uri => uri.includes(`localhost:${PORT}`)) || redirect_uris[0];
console.log('🔗 Using redirect URI:', redirectUri);
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

// --- 3. Auth endpoint ---
app.get('/auth', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent'
  });
  res.send(`<a href="${authUrl}">Authenticate with Google</a>`);
});

// --- 4. OAuth2 callback ---
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    res.send('Authentication successful! You can close this tab.');
    console.log('✅ Token obtained and saved to token.json');
  } catch (error) {
    console.error('❌ Error getting tokens:', error.response?.data || error.message);
    console.error('   client_id:', client_id);
    console.error('   client_secret:', client_secret ? client_secret.slice(0, 6) + '...' : 'undefined');
    res.status(500).json({ error: 'Authentication failed', details: error.response?.data || error.message });
  }
});

// --- 5. Start server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT}/auth to start OAuth flow`);
}); 