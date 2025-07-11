# 🚀 DEPLOY TO RAILWAY IN 3 MINUTES

## Option 1: Deploy via GitHub (Recommended)

### 1. Push to GitHub (1 minute)
```bash
git add -A
git commit -m "Ready for production deployment"
git push origin main
```

### 2. Deploy on Railway (2 minutes)
1. Go to https://railway.app
2. Click "Start a New Project"
3. Choose "Deploy from GitHub repo"
4. Select your `chattyai-calendar-bot` repository
5. Click "Deploy"

### 3. Add Environment Variables
Once deployed, go to your service → Variables and add:
```
TWILIO_ACCOUNT_SID=AC4c64f25251c2355995cc858286faf2d0
TWILIO_AUTH_TOKEN=98af8c3747ff3dcb871928ad76466f7b
TWILIO_FROM_NUMBER=+18778396798
JWT_SECRET=your-super-secret-jwt-key-minimum-256-bits
```

Also add your Google credentials (copy from your local files):
- `GOOGLE_CREDENTIALS` (contents of credentials.json)
- `GOOGLE_TOKEN` (contents of token.json)

### 4. Get Your Public URL
- Go to Settings → Networking
- Click "Generate Domain"
- Copy your URL (like `https://your-app.up.railway.app`)

### 5. Update Vapi
- In Vapi.ai, update webhook URL to: `https://your-app.up.railway.app/vapi`
- Remove the Authorization header (Railway handles auth differently)

## Option 2: Deploy via Railway CLI (Even Faster)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Link your repo
railway link

# Deploy
railway up

# Add variables
railway variables set TWILIO_ACCOUNT_SID=AC4c64f25251c2355995cc858286faf2d0
railway variables set TWILIO_AUTH_TOKEN=98af8c3747ff3dcb871928ad76466f7b
railway variables set TWILIO_FROM_NUMBER=+18778396798

# Get your URL
railway domain
```

## That's it! You're LIVE! 🎉

### What You Now Have:
- ✅ 24/7 uptime (no more laptop closures killing your service)
- ✅ Auto-scaling (handles 1 or 1000 calls)
- ✅ Real Google Calendar integration
- ✅ SMS alerts to 7027760084
- ✅ Customer confirmations
- ✅ Professional infrastructure

### Test Your System:
1. Call your AI assistant
2. Book an appointment
3. Check your phone for SMS alert
4. Check richard.gallagherxyz@gmail.com calendar

### Monthly Cost:
- Railway: $5-10/month
- Twilio: ~$3-5/month
- Total: Less than Netflix

### Next Steps (After Live):
1. Add Supabase for real database ($25/mo)
2. Add Sentry for error tracking (Free)
3. Add more AI personalities
4. Scale to 1000+ customers

## Troubleshooting:

**Server not starting?**
- Check logs in Railway dashboard
- Ensure all environment variables are set

**No SMS?**
- Verify Twilio credentials
- Check Twilio account balance

**Calendar not working?**
- Ensure GOOGLE_CREDENTIALS and GOOGLE_TOKEN are set
- May need to re-authenticate Google

## You Did It! 🚀

From local development to world-class infrastructure in minutes.
No more "it works on my machine" - it works for everyone, everywhere, 24/7. 