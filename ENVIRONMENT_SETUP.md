# 🚀 Environment Setup for Render Deployment

## Required Environment Variables

Set these in your Render dashboard under **Environment Variables**:

### 1. **GOOGLE_CREDENTIALS** (Required)
Your Google OAuth credentials JSON as a single line:
```json
{"installed":{"client_id":"YOUR_CLIENT_ID.apps.googleusercontent.com","project_id":"your-project","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"YOUR_CLIENT_SECRET","redirect_uris":["http://localhost"]}}
```

### 2. **GOOGLE_TOKEN** (Required)
Your Google OAuth token JSON as a single line:
```json
{"access_token":"ya29.a0...","refresh_token":"1//04dX...","scope":"https://www.googleapis.com/auth/calendar","token_type":"Bearer","expiry_date":1703123456789}
```

### 3. **JWT_SECRET** (Required)
A secure random string for JWT token signing:
```
aba46d4d5cc89ef9979373ab76bfa2dcb1c94ec3b09364111dbc57c49086842ffa2dc82cefb99f17b9c1d32d491623f3ed925721c5960c7f24f3319ac061ece9
```

### 4. **DATABASE_URL** (Required)
Your PostgreSQL connection string (Render sets this automatically for PostgreSQL services).

### 5. **PORT** (Optional)
Set to `4000` or let Render use the default.

## How to Get Google Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Download the JSON file
6. Copy the entire JSON content to `GOOGLE_CREDENTIALS`

## How to Get Google Token

1. Set up credentials first
2. Run locally: `node google-calendar-api.js`
3. Visit: `http://localhost:4000/auth`
4. Complete OAuth flow
5. Copy the generated `token.json` content to `GOOGLE_TOKEN`

## Quick Test

After setting all variables, your app should start without errors and show:
```
✅ Loaded credentials from environment variable
✅ Loaded token from environment variable
✅ Authentication successful
Server running on port 4000
``` 