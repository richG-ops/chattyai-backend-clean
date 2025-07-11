# 📅 Google Calendar OAuth Complete Setup

## Step 1: Google Cloud Console
1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Enable APIs:
   - Google Calendar API
   - Google+ API (for user info)

## Step 2: Create OAuth Credentials
1. APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: Web application
4. Add authorized redirect URIs:
   ```
   https://your-backend.onrender.com/auth/google/callback
   http://localhost:4000/auth/google/callback
   ```

## Step 3: Get Service Account (For Backend)
1. Create Credentials → Service account
2. Download JSON key file
3. Enable domain-wide delegation if needed

## Step 4: Google Workspace Setup ($6/mo)
1. Go to https://workspace.google.com
2. Sign up for Business Starter
3. Verify domain
4. Create business email

## Step 5: Implement OAuth Flow
```javascript
// Backend: google-oauth.js
const { OAuth2Client } = require('google-auth-library');

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate auth URL
exports.getAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  });
};

// Exchange code for tokens
exports.getTokens = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
};
```

## Step 6: Calendar Integration
```javascript
// Backend: calendar-service.js
const { google } = require('googleapis');

exports.getAvailability = async (accessToken, date) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  
  const calendar = google.calendar({ version: 'v3', auth });
  
  const events = await calendar.events.list({
    calendarId: 'primary',
    timeMin: date.startOf('day').toISOString(),
    timeMax: date.endOf('day').toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  });
  
  return events.data.items;
};
``` 