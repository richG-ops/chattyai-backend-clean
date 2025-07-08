# 🚀 Final Deployment Steps - ChattyAI Calendar Bot

## ✅ Completed
- Fixed all secret exposure issues
- Pushed clean code to GitHub
- Render will auto-deploy from the main branch

## 📋 Next Steps (Do These Now)

### 1. Go to Render Dashboard
Visit: https://dashboard.render.com/web/srv-ctcj9752ng1s73clnqhg

### 2. Set Environment Variables
In the Environment tab, add these variables:

#### Required Variables:
```
NODE_ENV=production
PORT=4000
JWT_SECRET=c13dc78e31b861b8020265d7472c4388e6f247b8fe36afabb19d11f314c8226ef035019979c5dbeb91ac430bd9a23f7f02f2f8fdc60dbaf67f8428f0ca924d60
```

#### Google Credentials (from your local credentials.json):
```
GOOGLE_CREDENTIALS={"web":{"client_id":"372700915954-mrjrbeais0kkorg5iufh7bnafbraqe82.apps.googleusercontent.com","project_id":"chattyai-407117","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"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","redirect_uris":["http://localhost:4000/auth/google/callback","https://chattyai-calendar-bot-1.onrender.com/auth/google/callback"]}}
```

### 3. Wait for Deployment
- Render will automatically redeploy after adding environment variables
- Check the logs to ensure successful startup

### 4. Complete OAuth Authentication
1. Visit: https://chattyai-calendar-bot-1.onrender.com/auth
2. Click "Authenticate with Google"
3. Complete the OAuth flow
4. Check Render logs for the token output (it will be logged)
5. Copy the entire token JSON

### 5. Add Google Token
Add the token from step 4 as an environment variable:
```
GOOGLE_TOKEN=(paste the token JSON from logs here)
```

### 6. Generate Test JWT Token
Run locally:
```bash
$env:JWT_SECRET="c13dc78e31b861b8020265d7472c4388e6f247b8fe36afabb19d11f314c8226ef035019979c5dbeb91ac430bd9a23f7f02f2f8fdc60dbaf67f8428f0ca924d60"
node scripts/generate-production-jwt.js
```

### 7. Test Your Production API

Test availability:
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_JWT_TOKEN_FROM_STEP_6"
}
Invoke-RestMethod -Uri "https://chattyai-calendar-bot-1.onrender.com/get-availability" -Headers $headers
```

Test booking:
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_JWT_TOKEN_FROM_STEP_6"
    "Content-Type" = "application/json"
}
$body = @{
    start = "2025-07-10T14:00:00Z"
    end = "2025-07-10T14:30:00Z"
    summary = "Production test appointment"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://chattyai-calendar-bot-1.onrender.com/book-appointment" -Method Post -Headers $headers -Body $body
```

## 🎉 Success Indicators
- ✅ Render shows "Live" status
- ✅ OAuth flow completes successfully
- ✅ API returns calendar availability
- ✅ Can book appointments successfully

## 🔧 Troubleshooting
- If OAuth fails: Check redirect URI in Google Cloud Console
- If API returns 401: Ensure JWT token is correct
- If API returns 500: Check Render logs for errors

## 📝 Production URL
Your API is now live at: https://chattyai-calendar-bot-1.onrender.com 