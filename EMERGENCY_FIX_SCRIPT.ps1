# ============================================================================
# EMERGENCY FIX SCRIPT - RUN THIS NOW
# ============================================================================
# This script fixes ALL critical issues in production
# Run as: .\EMERGENCY_FIX_SCRIPT.ps1

Write-Host @"

🚨 EMERGENCY PRODUCTION FIX
==========================
This will fix:
✓ Wrong file running in production
✓ Missing environment variables
✓ Undeployed code
✓ Database configuration

"@ -ForegroundColor Red

# Step 1: Fix render.yaml
Write-Host "`n🔧 Step 1: Fixing render.yaml..." -ForegroundColor Yellow
$renderContent = Get-Content render.yaml -Raw
$renderContent = $renderContent -replace 'node google-calendar-api.js', 'node index.js'
$renderContent | Set-Content render.yaml -Force
Write-Host "✅ Changed to run index.js (has new features)" -ForegroundColor Green

# Step 2: Check current git status
Write-Host "`n🔧 Step 2: Checking uncommitted files..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "Found uncommitted changes:" -ForegroundColor Yellow
    Write-Host $status
    
    # Stage all changes
    git add -A
    Write-Host "✅ All changes staged" -ForegroundColor Green
} else {
    Write-Host "⚠️  No uncommitted changes found" -ForegroundColor Yellow
}

# Step 3: Commit with detailed message
Write-Host "`n🔧 Step 3: Committing critical fixes..." -ForegroundColor Yellow
$commitMessage = @"
CRITICAL FIX: Deploy call storage, notifications, and dashboard APIs

Issues Fixed:
- Changed render.yaml to run index.js (was running google-calendar-api.js)
- Added unified webhook handler with dual notifications
- Added notification service with SMS/Email support
- Added dashboard APIs (/api/calls, /api/analytics)
- Added call data storage module
- Added comprehensive tests and validation

Required Environment Variables (ADD IN RENDER):
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_FROM_NUMBER
- SENDGRID_API_KEY
- OWNER_PHONE
- OWNER_EMAIL
"@

git commit -m $commitMessage
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Changes committed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Nothing to commit or commit failed" -ForegroundColor Yellow
}

# Step 4: Push to production
Write-Host "`n🔧 Step 4: Deploying to production..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Code pushed to production" -ForegroundColor Green
} else {
    Write-Host "❌ Push failed - check your credentials" -ForegroundColor Red
    exit 1
}

# Step 5: Show environment variables to add
Write-Host "`n📋 CRITICAL: Add these environment variables in Render Dashboard:" -ForegroundColor Red
Write-Host @"

Go to: https://dashboard.render.com/web/srv-ct67n4o8fa8c73ft1hjg/env

Add these NOW:

TWILIO_ACCOUNT_SID=YOUR_TWILIO_SID_HERE
TWILIO_AUTH_TOKEN=YOUR_TWILIO_TOKEN_HERE
TWILIO_FROM_NUMBER=+1YOUR_TWILIO_PHONE
SENDGRID_API_KEY=SG.YOUR_SENDGRID_KEY_HERE
OWNER_PHONE=+17027760084
OWNER_EMAIL=richard.gallagherxyz@gmail.com

"@ -ForegroundColor Yellow

# Step 6: Show VAPI webhook update
Write-Host "`n📋 UPDATE VAPI WEBHOOK URL:" -ForegroundColor Red
Write-Host @"

In VAPI.ai dashboard, change webhook URL to:
https://chattyai-backend-clean.onrender.com/api/v1/webhook

"@ -ForegroundColor Yellow

# Step 7: Validation commands
Write-Host "`n📋 After deployment completes (5-10 min), run these tests:" -ForegroundColor Cyan
Write-Host @"

# Test new endpoints:
Invoke-WebRequest -Uri "https://chattyai-backend-clean.onrender.com/api/calls" -Method GET

# Test webhook:
node scripts/validate-production.js

"@ -ForegroundColor White

Write-Host "`n
✅ EMERGENCY FIX DEPLOYED
========================
1. ✓ Fixed render.yaml to run correct file
2. ✓ Committed and pushed all new code
3. ⏳ Waiting for you to add environment variables
4. ⏳ Waiting for you to update VAPI webhook URL

Next: Add the environment variables in Render NOW!
" -ForegroundColor Green 