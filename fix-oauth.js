const { google } = require('googleapis');
const fs = require('fs');
const http = require('http');
const url = require('url');
const open = require('open');

// Load credentials
console.log('🔧 OAuth Fix Tool - Let\'s get your token!\n');

const credentials = JSON.parse(fs.readFileSync('credentials.json'));
const { client_id, client_secret, redirect_uris } = credentials.web;

// IMPORTANT: Use exact redirect URI from your Google Console
const REDIRECT_URI = 'http://localhost:4000/auth/google/callback';

console.log('📋 Using credentials:');
console.log(`Client ID: ${client_id.substring(0, 30)}...`);
console.log(`Redirect URI: ${REDIRECT_URI}\n`);

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  REDIRECT_URI
);

// Create auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar'],
  prompt: 'consent',
  redirect_uri: REDIRECT_URI  // Explicitly set redirect_uri
});

console.log('🔗 Auth URL generated!\n');

// Create simple server
const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/auth/google/callback')) {
    const qs = new url.URL(req.url, `http://localhost:4000`).searchParams;
    const code = qs.get('code');
    const error = qs.get('error');
    
    if (error) {
      res.end(`Error: ${error}`);
      server.close();
      return;
    }
    
    if (code) {
      console.log('✅ Got authorization code!\n');
      
      try {
        const { tokens } = await oauth2Client.getToken({
          code: code,
          redirect_uri: REDIRECT_URI  // Must match exactly
        });
        
        console.log('🎉 SUCCESS! Got your token:\n');
        console.log(JSON.stringify(tokens, null, 2));
        
        // Save token
        fs.writeFileSync('token.json', JSON.stringify(tokens, null, 2));
        console.log('\n💾 Saved to token.json');
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <h1 style="color: green;">✅ Success!</h1>
          <p>Your token has been saved to token.json</p>
          <p>You can close this window.</p>
          <h2>Token:</h2>
          <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px;">
${JSON.stringify(tokens, null, 2)}
          </pre>
        `);
        
        setTimeout(() => {
          console.log('\n✅ All done! Closing...');
          process.exit(0);
        }, 2000);
      } catch (err) {
        console.error('❌ Error getting token:', err.message);
        if (err.response) {
          console.error('Response data:', err.response.data);
        }
        res.end(`Error: ${err.message}`);
        server.close();
      }
    }
  }
});

server.listen(4000, () => {
  console.log('🚀 Server listening on http://localhost:4000');
  console.log('\n📱 Opening browser...\n');
  console.log('If browser doesn\'t open, manually visit:');
  console.log(authUrl);
  console.log('\n');
  
  open(authUrl);
}); 