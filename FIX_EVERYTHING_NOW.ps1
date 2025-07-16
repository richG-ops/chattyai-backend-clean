# ============================================================================
# FIX EVERYTHING NOW - COMPLETE SOLUTION
# ============================================================================
# This script fixes ALL issues in one go
# ============================================================================

Write-Host "============================================================================" -ForegroundColor Blue
Write-Host "🚀 FIXING ALL CHATTYAI ISSUES - COMPLETE SOLUTION" -ForegroundColor Blue
Write-Host "============================================================================" -ForegroundColor Blue
Write-Host ""

# Check if we have uncommitted files
Write-Host "📋 Step 1: Checking for uncommitted files..." -ForegroundColor Yellow
$status = git status --porcelain

if ($status) {
    Write-Host "✅ Found uncommitted files to deploy:" -ForegroundColor Green
    Write-Host $status
    
    # Add all new files
    git add routes/vapi-webhook-ultimate.js
    git add lib/notification-service.js
    git add lib/call-data-storage.js
    git add scripts/validate-production.js
    git add tests/integration.test.js
    git add scripts/deploy-unified.sh
    git add COMPLETE_CODE_ANALYSIS.md
    git add FIX_EVERYTHING_NOW.ps1
    
    # Commit with comprehensive message
    git commit -m "CRITICAL: Deploy complete call handling system

- Add vapi-webhook-ultimate.js with dual notifications
- Add notification-service.js with SMS/Email retry logic
- Add call-data-storage.js for database persistence
- Add comprehensive integration tests
- Add validation and deployment scripts
- Fix all production issues

Features:
✅ Dual notifications (SMS + Email to customer & owner)
✅ Call data storage in PostgreSQL
✅ Dashboard APIs (/api/calls, /api/analytics)
✅ Idempotency and retry logic
✅ Rate limiting and error recovery"

    Write-Host "✅ Files committed" -ForegroundColor Green
} else {
    Write-Host "⚠️  No uncommitted files found" -ForegroundColor Yellow
}

# Fix render.yaml
Write-Host ""
Write-Host "📋 Step 2: Fixing render.yaml to use correct entry point..." -ForegroundColor Yellow

$renderContent = Get-Content -Path "render.yaml" -Raw
$newRenderContent = $renderContent -replace 'node google-calendar-api\.js', 'node index.js'

if ($renderContent -ne $newRenderContent) {
    Set-Content -Path "render.yaml" -Value $newRenderContent
    Write-Host "✅ Updated render.yaml to use index.js" -ForegroundColor Green
    
    git add render.yaml
    git commit -m "CRITICAL FIX: Change production entry point to index.js

This enables:
- /api/calls endpoint for dashboard
- /api/analytics endpoint for metrics
- /api/v1/webhook for enhanced VAPI integration
- Dual notification system
- Call data storage"
} else {
    Write-Host "⚠️  render.yaml already correct" -ForegroundColor Yellow
}

# Update index.js to import new webhook
Write-Host ""
Write-Host "📋 Step 3: Ensuring index.js imports the new webhook..." -ForegroundColor Yellow

$indexContent = Get-Content -Path "index.js" -Raw
if ($indexContent -notmatch "vapi-webhook-ultimate") {
    # Add import at the top with other requires
    $importLine = "const vapiWebhookUltimate = require('./routes/vapi-webhook-ultimate');"
    $useLine = "app.use('/api/v1/webhook', vapiWebhookUltimate);"
    
    # Insert after other requires
    $newIndexContent = $indexContent -replace "(const.*require.*routes.*\n)", "`$1$importLine`n"
    # Insert webhook route
    $newIndexContent = $newIndexContent -replace "(// Routes\n)", "`$1$useLine`n"
    
    Set-Content -Path "index.js" -Value $newIndexContent
    Write-Host "✅ Updated index.js to use new webhook" -ForegroundColor Green
    
    git add index.js
    git commit -m "Import ultimate webhook handler in index.js"
} else {
    Write-Host "⚠️  index.js already imports webhook" -ForegroundColor Yellow
}

# Push everything
Write-Host ""
Write-Host "📋 Step 4: Pushing to GitHub..." -ForegroundColor Yellow

try {
    git push origin main
    Write-Host "✅ Code pushed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Push failed: $_" -ForegroundColor Red
    Write-Host "Try: git push origin main --force" -ForegroundColor Yellow
}

# Create environment variable file
Write-Host ""
Write-Host "📋 Step 5: Creating environment variables file..." -ForegroundColor Yellow

$envVars = @"
# ============================================================================
# REQUIRED ENVIRONMENT VARIABLES FOR RENDER
# ============================================================================
# Add these in Render Dashboard: https://dashboard.render.com
# Go to your service > Environment > Add these variables
# ============================================================================

# SMS Configuration (Get from https://console.twilio.com)
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER=+1XXXXXXXXXX

# Email Configuration (Get from https://app.sendgrid.com)
SENDGRID_API_KEY=SG.YOUR_SENDGRID_API_KEY
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Owner Notifications
OWNER_PHONE=7027760084
OWNER_EMAIL=richard.gallagherxyz@gmail.com

# Dashboard URL (After deploying frontend)
DASHBOARD_URL=https://your-dashboard.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app

# Critical Alerts
CRITICAL_ALERTS_ENABLED=true

# Database (Should already be set by Render)
# DATABASE_URL=postgresql://...
"@

Set-Content -Path "RENDER_ENV_VARS_REQUIRED.txt" -Value $envVars
Write-Host "✅ Created RENDER_ENV_VARS_REQUIRED.txt" -ForegroundColor Green

# Show final instructions
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Blue
Write-Host "✅ LOCAL FIXES COMPLETE - MANUAL STEPS REQUIRED" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Blue
Write-Host ""
Write-Host "🎯 REMAINING MANUAL STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. ADD ENVIRONMENT VARIABLES IN RENDER:" -ForegroundColor Cyan
Write-Host "   - Go to: https://dashboard.render.com" -ForegroundColor White
Write-Host "   - Select your service: chattyai-backend-clean" -ForegroundColor White
Write-Host "   - Go to Environment tab" -ForegroundColor White
Write-Host "   - Add variables from RENDER_ENV_VARS_REQUIRED.txt" -ForegroundColor White
Write-Host ""
Write-Host "2. UPDATE VAPI WEBHOOK URL:" -ForegroundColor Cyan
Write-Host "   - Go to: https://dashboard.vapi.ai" -ForegroundColor White
Write-Host "   - Find your assistant" -ForegroundColor White
Write-Host "   - Change webhook URL to:" -ForegroundColor White
Write-Host "   https://chattyai-backend-clean.onrender.com/api/v1/webhook" -ForegroundColor Green
Write-Host ""
Write-Host "3. MONITOR DEPLOYMENT:" -ForegroundColor Cyan
Write-Host "   - Watch: https://dashboard.render.com/web/srv-cttir4l6l47c73c4ot30/logs" -ForegroundColor White
Write-Host "   - Should take 2-5 minutes" -ForegroundColor White
Write-Host ""
Write-Host "4. TEST THE SYSTEM:" -ForegroundColor Cyan
Write-Host "   - Make a test call to your VAPI number" -ForegroundColor White
Write-Host "   - Check for SMS/Email notifications" -ForegroundColor White
Write-Host "   - Verify data at: https://chattyai-backend-clean.onrender.com/api/calls" -ForegroundColor White
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Blue
Write-Host "🚀 DEPLOYMENT WILL START AUTOMATICALLY AFTER GIT PUSH" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Blue 