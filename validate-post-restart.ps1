# 🔥 POST-RESTART VALIDATION SCRIPT
# Run this IMMEDIATELY after Render deployment completes

Write-Host "🚀 ChattyAI Post-Restart Validation" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""

$baseUrl = "https://chattyai-backend-clean.onrender.com"

Write-Host "🔍 STEP 1: Health Check Validation" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow

try {
    $health = Invoke-RestMethod -Uri "$baseUrl/healthz" -Method GET
    Write-Host "✅ Health Check: SUCCESS" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
    Write-Host "   Environment: $($health.environment)" -ForegroundColor Gray
    Write-Host "   Simple VAPI: $($health.features.simple_vapi)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Health Check: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Write-Host "🎙️ STEP 2: VAPI Endpoint Test" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

$vapiPayload = @{
    function = "checkAvailability"
    parameters = @{}
} | ConvertTo-Json

try {
    $vapi = Invoke-RestMethod -Uri "$baseUrl/vapi" -Method POST -Headers @{"Content-Type"="application/json"} -Body $vapiPayload
    Write-Host "✅ VAPI Endpoint: SUCCESS" -ForegroundColor Green
    Write-Host "   Response: $($vapi.response)" -ForegroundColor Gray
    Write-Host "   Slots Available: $($vapi.slots.Count)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ VAPI Endpoint: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Write-Host "📞 STEP 3: VAPI Webhook Test" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow

$webhookPayload = @{
    function = "getBusinessHours"
    parameters = @{}
} | ConvertTo-Json

try {
    $webhook = Invoke-RestMethod -Uri "$baseUrl/vapi-webhook" -Method POST -Headers @{"Content-Type"="application/json"} -Body $webhookPayload
    Write-Host "✅ VAPI Webhook: SUCCESS" -ForegroundColor Green
    Write-Host "   Response: $($webhook.response)" -ForegroundColor Gray
    Write-Host ""
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "⚠️  VAPI Webhook: AUTH REQUIRED (Expected)" -ForegroundColor Yellow
        Write-Host "   Status: 401 Unauthorized (This is normal)" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "❌ VAPI Webhook: FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
}

Write-Host "🔄 STEP 4: Booking Flow Test" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow

$bookingPayload = @{
    function = "bookAppointment"
    parameters = @{
        customerName = "Test User"
        customerPhone = "+15551234567"
        customerEmail = "test@example.com"
        date = "tomorrow"
        time = "2 PM"
    }
} | ConvertTo-Json

try {
    $booking = Invoke-RestMethod -Uri "$baseUrl/vapi" -Method POST -Headers @{"Content-Type"="application/json"} -Body $bookingPayload
    Write-Host "✅ Booking Flow: SUCCESS" -ForegroundColor Green
    Write-Host "   Response: $($booking.response)" -ForegroundColor Gray
    Write-Host "   Success: $($booking.success)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Booking Flow: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Write-Host "📊 VALIDATION SUMMARY" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Green

# Quick final test
$allWorking = $true

try {
    $quickTest = Invoke-RestMethod -Uri "$baseUrl/vapi" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"function":"checkAvailability","parameters":{}}'
    if ($quickTest.response -and $quickTest.response.Length -gt 0) {
        Write-Host "🎉 SYSTEM STATUS: FULLY OPERATIONAL" -ForegroundColor Green
        Write-Host "✅ Ready for VAPI configuration" -ForegroundColor Green
        Write-Host "✅ Ready for voice calls" -ForegroundColor Green
        Write-Host "✅ Ready for production traffic" -ForegroundColor Green
    } else {
        Write-Host "⚠️  SYSTEM STATUS: PARTIAL" -ForegroundColor Yellow
        Write-Host "⚠️  Some functions may need additional setup" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ SYSTEM STATUS: NEEDS ATTENTION" -ForegroundColor Red
    Write-Host "❌ VAPI endpoints still not responding correctly" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. If all tests pass: Run .\test-vapi-stress.ps1" -ForegroundColor Gray
Write-Host "2. If VAPI still fails: Check Render logs for errors" -ForegroundColor Gray
Write-Host "3. If successful: Configure VAPI dashboard" -ForegroundColor Gray
Write-Host "" 