# 🎤 Vapi.ai Complete Setup Guide

## Step 1: Create Vapi Account
1. Go to https://dashboard.vapi.ai/auth/signup
2. Sign up with business email
3. Verify email

## Step 2: Add Payment Method (REQUIRED)
1. Navigate to Billing → Payment Methods
2. Add credit card
3. Set monthly usage limit ($1000 recommended)

## Step 3: Get API Keys
1. Go to Account → API Keys
2. Copy your Private API Key
3. Save it securely

## Step 4: Choose Voice Provider
- **Best Quality**: ElevenLabs ($0.05/min)
- **Good Quality**: PlayHT ($0.03/min)
- **Budget**: Deepgram ($0.01/min)

## Step 5: Connect to Your Backend
```env
VAPI_API_KEY=your-private-api-key
VAPI_PHONE_NUMBER_ID=your-phone-id
VAPI_ASSISTANT_ID=your-assistant-id
```

## Step 6: Create Phone Number
```javascript
const response = await fetch('https://api.vapi.ai/phone-number', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${VAPI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    provider: 'twilio',
    twilioAccountSid: 'YOUR_TWILIO_SID',
    twilioAuthToken: 'YOUR_TWILIO_TOKEN',
    number: '+1234567890' // Your Twilio number
  })
})
``` 