# Test Production System
Write-Host "🧪 Testing Production System..." -ForegroundColor Blue

$baseUrl = "https://chattyai-backend-clean.onrender.com"

# Test 1: Health Check
Write-Host "`n1. Testing health endpoint..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$baseUrl/healthz" -Method GET
Write-Host "✅ Health: $($health.status)" -ForegroundColor Green

# Test 2: Call History API
Write-Host "`n2. Testing call history API..." -ForegroundColor Yellow
try {
    $calls = Invoke-RestMethod -Uri "$baseUrl/api/calls" -Method GET
    Write-Host "✅ Calls API working - Found $($calls.data.Count) calls" -ForegroundColor Green
} catch {
    Write-Host "❌ Calls API failed: $_" -ForegroundColor Red
}

# Test 3: Analytics API
Write-Host "`n3. Testing analytics API..." -ForegroundColor Yellow
try {
    $analytics = Invoke-RestMethod -Uri "$baseUrl/api/analytics" -Method GET
    Write-Host "✅ Analytics API working" -ForegroundColor Green
    Write-Host "   Total calls: $($analytics.overview.total_calls)" -ForegroundColor Gray
    Write-Host "   Conversion rate: $($analytics.overview.conversion_rate)%" -ForegroundColor Gray
} catch {
    Write-Host "❌ Analytics API failed: $_" -ForegroundColor Red
}

# Test 4: Make a test call via VAPI
Write-Host "`n4. VAPI Test Instructions:" -ForegroundColor Yellow
Write-Host "   1. Go to https://dashboard.vapi.ai" -ForegroundColor White
Write-Host "   2. Find your assistant" -ForegroundColor White
Write-Host "   3. Click 'Test Call' button" -ForegroundColor White
Write-Host "   4. Book an appointment" -ForegroundColor White
Write-Host "   5. Check for SMS/Email notifications" -ForegroundColor White

Write-Host "`n✅ Production system test complete!" -ForegroundColor Green 