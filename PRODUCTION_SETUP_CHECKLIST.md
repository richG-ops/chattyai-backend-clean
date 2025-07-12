# 🚀 PRODUCTION SETUP CHECKLIST

## **STEP 1: Set Google Calendar Credentials (15 min)**

### Go to Render Dashboard:
1. Visit: https://dashboard.render.com
2. Click on your service: `chattyai-backend-clean`
3. Go to **Environment** tab
4. Click **Add Environment Variable**

### Add GOOGLE_CREDENTIALS:
- **Key**: `GOOGLE_CREDENTIALS`
- **Value**: Copy your entire `credentials.json` file content as ONE LINE
- Example format:
```json
{"web":{"client_id":"YOUR_CLIENT_ID.apps.googleusercontent.com","project_id":"your-project","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","client_secret":"YOUR_CLIENT_SECRET","redirect_uris":["https://chattyai-backend-clean.onrender.com/auth/google/callback"]}}
```

### Add GOOGLE_TOKEN:
- **Key**: `GOOGLE_TOKEN` 
- **Value**: Copy your entire `token.json` file content as ONE LINE
- Example format:
```json
{"access_token":"ya29.xxx","refresh_token":"1//04xxx","scope":"https://www.googleapis.com/auth/calendar","token_type":"Bearer","expiry_date":1234567890}
```

## **STEP 2: Set SMS Credentials (5 min)**

### Go to https://console.twilio.com/
1. Sign up for free Twilio account
2. Get your Account SID, Auth Token, and Phone Number

### Add to Render:
- **Key**: `TWILIO_ACCOUNT_SID`
- **Value**: Your Twilio Account SID (starts with AC...)

- **Key**: `TWILIO_AUTH_TOKEN`  
- **Value**: Your Twilio Auth Token

- **Key**: `TWILIO_FROM_NUMBER`
- **Value**: Your Twilio phone number (format: +15551234567)

## **STEP 3: Test End-to-End (10 min)**

### Test VAPI Endpoint:
```bash
curl -X POST https://chattyai-backend-clean.onrender.com/vapi \
  -H "Content-Type: application/json" \
  -d '{"function":"checkAvailability","parameters":{}}'
```

### Test Calendar Booking:
```bash
curl -X POST https://chattyai-backend-clean.onrender.com/vapi \
  -H "Content-Type: application/json" \
  -d '{"function":"bookAppointment","parameters":{"customerName":"Test User","date":"tomorrow","time":"2 PM","phone":"+15551234567"}}'
```

## **STEP 4: Update Your Voice Agent**

### In Vapi.ai Dashboard:
1. Set webhook URL: `https://chattyai-backend-clean.onrender.com/vapi`
2. Remove any Authorization headers
3. Test your voice agent

## **✅ VERIFICATION CHECKLIST**

After completing setup, verify:
- [ ] Health check returns Google Calendar: true
- [ ] VAPI endpoint responds with real availability
- [ ] Calendar booking creates real events
- [ ] SMS notifications are sent
- [ ] Voice agent can book appointments successfully

## **🎯 EXPECTED RESULT**

Once configured, your voice agent will:
1. **Check real calendar availability** ✅
2. **Book appointments in Google Calendar** ✅  
3. **Send SMS confirmations to customers** ✅
4. **Send SMS alerts to you** ✅

**Time to complete: 30 minutes**
**Result: Fully functional voice AI calendar booking system** 