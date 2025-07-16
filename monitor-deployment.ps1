# 🚀 Deployment Monitor - Watch for VAPI Fix
# Run this to monitor the deployment and test immediately

Write-Host "🔄 Monitoring Render Deployment..." -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://chattyai-backend-clean.onrender.com"
$maxAttempts = 20
$attempt = 0

Write-Host "⏱️  Waiting for deployment to complete..." -ForegroundColor Yellow
Write-Host "   This usually takes 2-3 minutes" -ForegroundColor Gray
Write-Host ""

do {
    $attempt++
    Write-Host "🔍 Attempt $attempt/$maxAttempts..." -ForegroundColor White
    
    try {
        # Test health first
        $health = Invoke-RestMethod -Uri "$baseUrl/healthz" -Method GET -TimeoutSec 10
        Write-Host "   ✅ Health: OK" -ForegroundColor Green
        
        # Test VAPI endpoint - THE CRITICAL TEST
        $vapiTest = @{
            function = "checkAvailability"
            parameters = @{}
        } | ConvertTo-Json
        
        $vapi = Invoke-RestMethod -Uri "$baseUrl/vapi" -Method POST -Headers @{"Content-Type"="application/json"} -Body $vapiTest -TimeoutSec 10
        
        # SUCCESS!
        Write-Host ""
        Write-Host "🎉 SUCCESS! VAPI ENDPOINT IS WORKING!" -ForegroundColor Green
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host "✅ Response: $($vapi.response)" -ForegroundColor Green
        Write-Host "✅ Slots: $($vapi.slots.Count) available" -ForegroundColor Green
        Write-Host ""
        Write-Host "🚀 READY FOR VAPI CONFIGURATION!" -ForegroundColor Green
        Write-Host "🎙️ Voice calls will now work!" -ForegroundColor Green
        Write-Host ""
        
        # Now run full validation
        Write-Host "🔄 Running full validation..." -ForegroundColor Yellow
        .\validate-post-restart.ps1
        break
        
    } catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -like "*404*") {
            Write-Host "   ❌ Still 404 - deployment in progress..." -ForegroundColor Red
        } elseif ($errorMsg -like "*timeout*") {
            Write-Host "   ⏰ Timeout - server starting up..." -ForegroundColor Yellow
        } else {
            Write-Host "   ⚠️  Error: $errorMsg" -ForegroundColor Yellow
        }
        
        if ($attempt -lt $maxAttempts) {
            Write-Host "   ⏳ Waiting 15 seconds..." -ForegroundColor Gray
            Start-Sleep -Seconds 15
        }
    }
} while ($attempt -lt $maxAttempts)

if ($attempt -eq $maxAttempts) {
    Write-Host ""
    Write-Host "⚠️  Deployment taking longer than expected" -ForegroundColor Yellow
    Write-Host "   Check Render dashboard for deployment status" -ForegroundColor Gray
    Write-Host "   URL: https://dashboard.render.com" -ForegroundColor Gray
} 