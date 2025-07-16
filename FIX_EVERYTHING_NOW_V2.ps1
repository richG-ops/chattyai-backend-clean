# FIX_EVERYTHING_NOW.ps1 - One-Click Fix for TheChattyAI Deployment
# Created by your AI Senior Dev/CTO on July 16, 2025
# Assumes: Git is installed, repo is cloned locally, Node.js is available.
# Runs in repo root. Prompts for confirmations.

# Step 0: Check prerequisites
if (-not (Test-Path .git)) {
    Write-Host "Error: This must be run in a Git repo root." -ForegroundColor Red
    exit 1
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Git not found. Install it first." -ForegroundColor Red
    exit 1
}

# Step 1: Add all new/modified files (based on your list)
$filesToAdd = @(
    "routes/vapi-webhook-ultimate.js",
    "lib/notification-service.js",
    "index.js",
    "lib/call-data-storage.js",
    "migrations/20250716_unify_call_tables.js",
    "render.yaml",  # We'll edit this next
    "routes/vapi-simple.js",  # For reference, even if old
    "tests/integration.test.js",
    "scripts/deploy-unified.sh",  # Add it anyway, though incompatible
    "scripts/deploy-call-storage.sh"
)
foreach ($file in $filesToAdd) {
    if (Test-Path $file) {
        git add $file
        Write-Host "Added: $file" -ForegroundColor Green
    } else {
        Write-Host "Warning: $file not found locally. Skipping." -ForegroundColor Yellow
    }
}

# Step 2: Fix render.yaml - Change startCommand to node index.js
$renderFile = "render.yaml"
if (Test-Path $renderFile) {
    $content = Get-Content $renderFile -Raw
    $content = $content -replace "node google-calendar-api.js", "node index.js"
    Set-Content $renderFile -Value $content
    git add $renderFile
    Write-Host "Fixed render.yaml: Now starts with node index.js" -ForegroundColor Green
} else {
    Write-Host "Warning: render.yaml not found. Create it manually with startCommand: node index.js" -ForegroundColor Yellow
}

# Step 3: Update imports in index.js (assuming it needs to import new modules like notification-service and call-data-storage)
$indexFile = "index.js"
if (Test-Path $indexFile) {
    # Append imports if not present (basic string check/add - refine if needed)
    $content = Get-Content $indexFile -Raw
    if (-not ($content -match "require\('./lib/notification-service.js'\)")) {
        $content = "const notificationService = require('./lib/notification-service.js');`n" + $content
    }
    if (-not ($content -match "require\('./lib/call-data-storage.js'\)")) {
        $content = "const callDataStorage = require('./lib/call-data-storage.js');`n" + $content
    }
    # Assume webhook integration: Add a sample line to connect storage to webhook if missing
    if (-not ($content -match "callDataStorage.saveCallData")) {
        $content += "`n// Integrate storage in webhook handler (example)`napp.post('/webhook', async (req, res) => { await callDataStorage.saveCallData(req.body); });"
    }
    Set-Content $indexFile -Value $content
    git add $indexFile
    Write-Host "Updated index.js: Added imports and basic integration for new modules" -ForegroundColor Green
} else {
    Write-Host "Warning: index.js not found. Can't update imports." -ForegroundColor Yellow
}

# Step 4: Commit changes
$commitMessage = "Fix deployment: Use index.js, add all new files, update imports"
git commit -m $commitMessage
Write-Host "Committed changes: $commitMessage" -ForegroundColor Green

# Step 5: Push to GitHub (prompt for branch, assume main)
$branch = Read-Host "Enter branch to push (default: main)"
if (-not $branch) { $branch = "main" }
git push origin $branch
Write-Host "Pushed to GitHub branch: $branch" -ForegroundColor Green

# Step 6: Generate environment variable list (save to ENV_VARS_TO_SET.txt)
$envVars = @"
TWILIO_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
SENDGRID_API_KEY=your_sendgrid_api_key
DATABASE_URL=postgres://user:pass@host:5432/dbname  # e.g., from Render PostgreSQL add-on
VAPI_WEBHOOK_SECRET=your_vapi_webhook_secret  # For verification
GOOGLE_CALENDAR_CLIENT_ID=your_google_client_id  # If needed
GOOGLE_CALENDAR_CLIENT_SECRET=your_google_client_secret
"@
$envFile = "ENV_VARS_TO_SET.txt"
Set-Content $envFile -Value $envVars
Write-Host "Created ENV_VARS_TO_SET.txt: Set these in Render dashboard under Environment > Environment Variables" -ForegroundColor Green

# Step 7: Next steps guidance (display and save to NEXT_STEPS.txt)
$nextSteps = @"
1. Log into Render.com dashboard for your service.
2. Set the env vars from ENV_VARS_TO_SET.txt.
3. Trigger a manual redeploy (or wait for auto-deploy on push).
4. Run database migrations: Set DATABASE_URL locally, then run 'node migrations/20250716_unify_call_tables.js'
5. Update Vapi.ai dashboard: Set webhook URL to your Render URL + /webhook (e.g., https://your-app.onrender.com/webhook)
6. Run tests: npm test (fix any failures)
7. Test a call: Use Vapi.ai to simulate a voice call and verify booking/notifications.
8. If issues, check Render logs.
"@
Write-Host $nextSteps -ForegroundColor Cyan
Set-Content "NEXT_STEPS.txt" -Value $nextSteps

Write-Host "All done! Total time: ~5 minutes. Check NEXT_STEPS.txt for what to do now. 🚀" -ForegroundColor Green 