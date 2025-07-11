# 📱 Twilio Complete Setup Guide

## Step 1: Create Twilio Account
1. Go to https://www.twilio.com/try-twilio
2. Sign up (get $15 free credit)
3. Verify your phone number

## Step 2: Get Credentials
1. Dashboard → Account Info
2. Copy:
   - Account SID
   - Auth Token
   - Phone Number

## Step 3: Buy Phone Numbers
1. Phone Numbers → Buy a Number
2. Choose:
   - **Local**: $1/month (recommended)
   - **Toll-Free**: $2/month
   - **Mobile**: $1.25/month

## Step 4: Configure for Vapi
```javascript
// Backend: twilio-config.js
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Forward calls to Vapi
exports.forwardToVapi = async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.redirect({
    method: 'POST'
  }, process.env.VAPI_WEBHOOK_URL);
  
  res.type('text/xml');
  res.send(twiml.toString());
};
```

## Step 5: Webhook Configuration
1. Phone Numbers → Manage → Your Number
2. Voice & Fax → Webhook:
   ```
   https://your-backend.onrender.com/twilio/voice
   ```

## Monthly Costs:
- Phone Numbers: $1-2 each
- Incoming calls: $0.0085/min
- Outgoing calls: $0.013/min
- SMS: $0.0075/message 