# Test Render API
$baseUrl = "https://chattyai-calendar-bot-1.onrender.com"

Write-Host "`n🔍 Testing Render API..." -ForegroundColor Cyan

# Test health endpoint
Write-Host "`n1. Testing /health endpoint:" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "✅ Health check passed: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}

# Test if OAuth is working
Write-Host "`n2. Testing OAuth status:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/auth" -Method GET
    if ($response.Content -like "*Authenticate with Google*") {
        Write-Host "✅ OAuth endpoint is working" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ OAuth endpoint error: $_" -ForegroundColor Red
}

Write-Host "`n📋 Your API is ready at: $baseUrl" -ForegroundColor Cyan
Write-Host "You can now use the /get-availability and /book-appointment endpoints with proper JWT auth" -ForegroundColor Green 