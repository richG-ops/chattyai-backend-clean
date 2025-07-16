# 🚀 DEPLOYMENT MONITORING GUIDE

## 📊 REAL-TIME STATUS CHECKS

### 1. Check Deployment Progress
Go to: https://dashboard.render.com
- Click on your service: `chattyai-backend-clean`
- Watch the build logs
- Look for: `==> Starting service with 'node src/index.js'`

### 2. Test Endpoints (After ~5 minutes)

#### Health Check
```powershell
# Basic health
Invoke-WebRequest -Uri "https://chattyai-backend-clean.onrender.com/health" -UseBasicParsing

# Extended health (NEW)
Invoke-WebRequest -Uri "https://chattyai-backend-clean.onrender.com/healthz" -UseBasicParsing
```

#### Dashboard APIs (NEW - Requires JWT)
```powershell
# First, get your JWT token
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiMDFiYTE2OGRkMzBjMDM3N2MxZjBjNzRiOTM2ZjQyNzQiLCJpYXQiOjE3NTIwMDgzNjcsImV4cCI6MTc4MzU0NDM2N30.zelpVbu-alSaAfMSkSsne2gaaWETqdbakzui5Pbi_Ts"

# Test call history API
$headers = @{ Authorization = "Bearer $token" }
Invoke-WebRequest -Uri "https://chattyai-backend-clean.onrender.com/api/calls" -Headers $headers -UseBasicParsing

# Test analytics API
Invoke-WebRequest -Uri "https://chattyai-backend-clean.onrender.com/api/analytics" -Headers $headers -UseBasicParsing

# Test real-time dashboard data
Invoke-WebRequest -Uri "https://chattyai-backend-clean.onrender.com/api/dashboard/realtime" -Headers $headers -UseBasicParsing
```

#### Calendar Endpoints
```powershell
# Get availability
Invoke-WebRequest -Uri "https://chattyai-backend-clean.onrender.com/get-availability" -Headers $headers -UseBasicParsing

# Book appointment (POST)
$body = @{
    start = "2025-01-20T14:00:00Z"
    end = "2025-01-20T14:30:00Z"
    summary = "Test Appointment"
    customerName = "Test User"
    customerPhone = "+1234567890"
    customerEmail = "test@example.com"
    service = "Consultation"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://chattyai-backend-clean.onrender.com/book-appointment" `
    -Method POST `
    -Headers $headers `
    -Body $body `
    -ContentType "application/json" `
    -UseBasicParsing
```

## 🔴 IF ENDPOINTS RETURN 404

This means Render is still running the old code. Solutions:

1. **Force Rebuild in Render**:
   - Go to Render Dashboard
   - Click "Manual Deploy" → "Deploy latest commit"

2. **Check Environment Variables**:
   Ensure these are set in Render:
   - `JWT_SECRET`
   - `GOOGLE_CREDENTIALS`
   - `GOOGLE_TOKEN`
   - `DATABASE_URL`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`

3. **Verify Start Command**:
   - In Render settings, ensure Start Command is: `node src/index.js`
   - NOT `node google-calendar-api.js`

## ✅ SUCCESS INDICATORS

When deployment is successful, you'll see:
- `/health` returns: `{"status":"healthy","version":"2.0.0"}`
- `/api/calls` returns call data (or empty array)
- `/api/analytics` returns metrics object
- No 404 errors on new endpoints

## 🚨 TROUBLESHOOTING

### Issue: "Cannot find module './vapi-plugin'"
**Fix**: The file needs to be in src/vapi-plugin.js

### Issue: "Database connection failed"
**Fix**: Add DATABASE_URL in Render environment variables

### Issue: "Missing Twilio credentials"
**Fix**: Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN

## 📞 VAPI.AI WEBHOOK UPDATE

Once deployed, update your VAPI assistant:
1. Go to VAPI.ai dashboard
2. Set webhook URL to: `https://chattyai-backend-clean.onrender.com/api/v1/webhook`
3. Add webhook secret to match your VAPI_WEBHOOK_SECRET env var

## 🎯 FINAL VALIDATION

Make a test phone call through VAPI:
1. Call your VAPI number
2. Say: "I'd like to book an appointment tomorrow at 2pm"
3. Check Render logs for webhook processing
4. Verify booking appears in Google Calendar
5. Check if SMS/email notifications sent

---

**Deployment typically takes 5-10 minutes. Monitor the Render dashboard for real-time status.** 