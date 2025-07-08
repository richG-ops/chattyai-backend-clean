const { google } = require('googleapis');
const fs = require('fs');

const credentials = JSON.parse(fs.readFileSync('credentials.json'));
const { client_id, client_secret } = credentials.web;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  'http://localhost:4000/auth/google/callback'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar'],
  prompt: 'consent'
});

console.log('\n🔗 COPY AND PASTE THIS URL IN YOUR BROWSER:\n');
console.log(authUrl);
console.log('\n✅ The server is already running and waiting for you!'); 