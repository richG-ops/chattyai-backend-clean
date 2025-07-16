# ============================================================================
# IMMEDIATE DEPLOYMENT FIX - FORCE RENDER TO USE NEW CODE
# ============================================================================
# Purpose: Ensure Render uses src/index.js instead of old google-calendar-api.js
# ============================================================================

Write-Host @"
============================================================================
🚀 FORCING RENDER TO DEPLOY NEW UNIFIED BACKEND
============================================================================
"@ -ForegroundColor Cyan

# Step 1: Check current git status
Write-Host "`n📋 Checking Git Status..." -ForegroundColor Yellow
git status --short

# Step 2: Ensure package.json points to correct file
Write-Host "`n📋 Updating package.json start script..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$packageJson.scripts.start = "node src/index.js"
$packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
Write-Host "✅ Updated package.json to use src/index.js" -ForegroundColor Green

# Step 3: Create a deployment trigger file
Write-Host "`n📋 Creating deployment trigger..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$content = @"
Deployment triggered at: $timestamp
Purpose: Force Render to use new unified backend at src/index.js
"@
$content | Out-File -FilePath "DEPLOY_TRIGGER.txt" -Encoding UTF8

# Step 4: Commit and push changes
Write-Host "`n📋 Committing changes..." -ForegroundColor Yellow
git add package.json DEPLOY_TRIGGER.txt
git commit -m "CRITICAL: Force deployment to use src/index.js instead of google-calendar-api.js"

Write-Host "`n📋 Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host @"

============================================================================
✅ DEPLOYMENT TRIGGERED
============================================================================

Next Steps:
1. Go to: https://dashboard.render.com
2. Click on your service: chattyai-backend-clean
3. Watch the build logs (should show "node src/index.js")
4. Wait ~5 minutes for deployment

Test with:
curl https://chattyai-backend-clean.onrender.com/api/calls
curl https://chattyai-backend-clean.onrender.com/api/analytics

These endpoints will work once the new code deploys!

============================================================================
"@ -ForegroundColor Green 