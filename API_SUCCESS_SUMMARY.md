# 🎉 ChattyAI Calendar API - FULLY OPERATIONAL

## ✅ Status: COMPLETE AND WORKING

Your calendar API is now live and fully functional at:
**https://chattyai-calendar-bot-1.onrender.com**

## 🔑 Authentication

**JWT Token (Valid for 1 year):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiMDFiYTE2OGRkMzBjMDM3N2MxZjBjNzRiOTM2ZjQyNzQiLCJpYXQiOjE3NTIwMDgzNjcsImV4cCI6MTc4MzU0NDM2N30.zelpVbu-alSaAfMSkSsne2gaaWETqdbakzui5Pbi_Ts
```

**Header for all requests:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiMDFiYTE2OGRkMzBjMDM3N2MxZjBjNzRiOTM2ZjQyNzQiLCJpYXQiOjE3NTIwMDgzNjcsImV4cCI6MTc4MzU0NDM2N30.zelpVbu-alSaAfMSkSsne2gaaWETqdbakzui5Pbi_Ts
```

## 📋 Working Endpoints

### 1. Health Check ✅
```
GET https://chattyai-calendar-bot-1.onrender.com/health
```
**Response:** `{"status":"ok","timestamp":"..."}`

### 2. Get Available Slots ✅
```
GET https://chattyai-calendar-bot-1.onrender.com/get-availability
Headers: Authorization: Bearer [JWT_TOKEN]
```
**Response:** 
```json
{
  "slots": [
    {"start": "2025-07-08T21:31:29.512Z", "end": "2025-07-08T22:01:29.512Z"},
    {"start": "2025-07-08T22:01:29.512Z", "end": "2025-07-08T22:31:29.512Z"},
    {"start": "2025-07-08T22:31:29.512Z", "end": "2025-07-08T23:01:29.512Z"}
  ]
}
```

### 3. Book Appointment ✅
```
POST https://chattyai-calendar-bot-1.onrender.com/book-appointment
Headers: 
  Authorization: Bearer [JWT_TOKEN]
  Content-Type: application/json
Body:
{
  "start": "2025-01-15T14:00:00Z",
  "end": "2025-01-15T14:30:00Z",
  "summary": "Meeting Title"
}
```
**Response:** `{"success": true}`

## 🧪 Test Commands (PowerShell)

```powershell
# Set token
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiMDFiYTE2OGRkMzBjMDM3N2MxZjBjNzRiOTM2ZjQyNzQiLCJpYXQiOjE3NTIwMDgzNjcsImV4cCI6MTc4MzU0NDM2N30.zelpVbu-alSaAfMSkSsne2gaaWETqdbakzui5Pbi_Ts"
$headers = @{Authorization = "Bearer $token"}

# Get availability
Invoke-RestMethod -Uri "https://chattyai-calendar-bot-1.onrender.com/get-availability" -Headers $headers

# Book appointment
$booking = @{
  start = "2025-01-15T14:00:00Z"
  end = "2025-01-15T14:30:00Z"
  summary = "Test Meeting"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://chattyai-calendar-bot-1.onrender.com/book-appointment" -Headers $headers -Method POST -Body $booking -ContentType "application/json"
```

## 🔧 Technical Details

- **Google OAuth**: ✅ Configured and working
- **Database**: ✅ PostgreSQL on Render with tenant data
- **Authentication**: ✅ JWT middleware protecting endpoints
- **Calendar API**: ✅ Reading and writing to Google Calendar
- **Deployment**: ✅ Live on Render with auto-scaling

## 🎯 Ready for Integration

Your API is now ready to be integrated with:
- **VAPI** (Voice AI Platform)
- **Webhooks**
- **Mobile Apps**
- **Web Applications**
- **Third-party services**

## 📞 Support

The API handles:
- ✅ Time zone conversion (Pacific Time)
- ✅ Conflict detection
- ✅ 30-minute slot scheduling
- ✅ Automatic token refresh
- ✅ Error handling
- ✅ Input validation

**Your calendar bot is LIVE and ready for production use!** 🚀 