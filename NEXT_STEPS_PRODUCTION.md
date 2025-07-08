# Next Steps for Production Deployment

## ✅ What We've Accomplished

1. **Fixed Local Development**
   - OAuth authentication working perfectly
   - Can successfully read calendar availability
   - Can successfully book appointments
   - All credentials properly configured

2. **Code Updates**
   - Fixed middleware to use real Google credentials
   - Updated OAuth client creation to handle both web/installed types
   - Added production-ready redirect URI handling
   - Improved token logging for production setup

## 🚀 Next Steps for Production

### Step 1: Go to Render Dashboard
Visit: https://dashboard.render.com

### Step 2: Add Environment Variables
In your service settings, add these environment variables:

1. **JWT_SECRET** 
   ```
   Generate a new one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **GOOGLE_CREDENTIALS**
   ```
   {"web":{"client_id":"372700915954-mrjrbeais0kkorg5iufh7bnafbraqe82.apps.googleusercontent.com","project_id":"chattyai-407117","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"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","redirect_uris":["http://localhost:4000/auth/google/callback","https://chattyai-calendar-bot-1.onrender.com/auth/google/callback"]}}
   ```

3. **NODE_ENV**
   ```
   production
   ```

4. **PORT**
   ```
   4000
   ```

### Step 3: Deploy and Authenticate

1. After adding environment variables, Render will auto-deploy
2. Once deployed, visit: https://chattyai-calendar-bot-1.onrender.com/auth
3. Click "Authenticate with Google"
4. Complete the OAuth flow
5. Check Render logs for the token output
6. Copy the token JSON from logs
7. Add it as **GOOGLE_TOKEN** environment variable

### Step 4: Test the API

Create a JWT token for testing:
```javascript
// Save as generate-jwt.js and run with your production JWT_SECRET
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { api_key: 'test-api-key' },
  'YOUR_PRODUCTION_JWT_SECRET',
  { expiresIn: '365d' }
);
console.log(token);
```

Test the endpoints:
```bash
# Test availability
curl -X GET "https://chattyai-calendar-bot-1.onrender.com/get-availability" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test booking
curl -X POST "https://chattyai-calendar-bot-1.onrender.com/book-appointment" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"start":"2025-07-10T14:00:00Z","end":"2025-07-10T14:30:00Z","summary":"Test from production"}'
```

## 📝 Important Notes

- The Google Cloud Console already has both redirect URIs configured
- The production URL is: https://chattyai-calendar-bot-1.onrender.com
- Monitor Render logs during OAuth to capture the token
- The JWT token is used for API authentication, not Google OAuth

## 🎉 Once Complete

Your ChattyAI Calendar Bot will be:
- Fully deployed on Render
- Connected to your Google Calendar
- Ready to handle appointment bookings via API
- Secured with JWT authentication

## 🔧 Troubleshooting

If you encounter issues:
1. Check Render logs for error messages
2. Ensure all environment variables are set correctly
3. Verify the redirect URI matches in Google Cloud Console
4. Make sure to use the production redirect URI when authenticating on Render 