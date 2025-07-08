const { google } = require('googleapis');
const fs = require('fs');
const http = require('http');
const url = require('url');

console.log('🔧 Getting your Google OAuth Token...\n');

// Load credentials
const credentials = JSON.parse(fs.readFileSync('credentials.json'));
const { client_id, client_secret } = credentials.web;

// Use localhost redirect
const REDIRECT_URI = 'http://localhost:4000/auth/google/callback';

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  REDIRECT_URI
);

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar'],
  prompt: 'consent'
});

// Create server to handle callback
const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/auth/google/callback')) {
    const qs = new url.URL(req.url, 'http://localhost:4000').searchParams;
    const code = qs.get('code');
    
    if (code) {
      try {
        const { tokens } = await oauth2Client.getToken(code);
        
        // Save token
        fs.writeFileSync('token.json', JSON.stringify(tokens, null, 2));
        
        console.log('\n✅ SUCCESS! Token saved to token.json');
        console.log('\nYour token (also saved in token.json):');
        console.log(JSON.stringify(tokens, null, 2));
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <h1>✅ Success!</h1>
          <p>Token saved to token.json</p>
          <h2>Next Steps:</h2>
          <ol>
            <li>Copy the token from token.json</li>
            <li>Add it to Render as GOOGLE_TOKEN env var</li>
            <li>Also add GOOGLE_CREDENTIALS env var with your credentials.json content</li>
          </ol>
          <pre>${JSON.stringify(tokens, null, 2)}</pre>
        `);
        
        setTimeout(() => process.exit(0), 2000);
      } catch (err) {
        console.error('❌ Error:', err.message);
        res.end('Error: ' + err.message);
      }
    }
  }
});

server.listen(4000, () => {
  console.log('✅ Server running on http://localhost:4000\n');
  console.log('📋 COPY THIS URL AND PASTE IN YOUR BROWSER:\n');
  console.log(authUrl);
  console.log('\n');
}); 