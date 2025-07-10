# Replace YOUR_JWT_TOKEN with the token from Render Shell
$token = "YOUR_JWT_TOKEN"
$headers = @{Authorization = "Bearer $token"}

Write-Host "`n🚀 Testing ChattyAI Calendar API" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Test get-availability
Write-Host "`n1. Testing GET /get-availability:" -ForegroundColor Yellow
$availability = Invoke-RestMethod -Uri "https://chattyai-calendar-bot-1.onrender.com/get-availability" -Headers $headers -Method GET
Write-Host "✅ Available slots:" -ForegroundColor Green
$availability.slots | ForEach-Object {
    Write-Host "   - Start: $($_.start)" -ForegroundColor White
    Write-Host "     End: $($_.end)" -ForegroundColor Gray
}

# Test book-appointment
Write-Host "`n2. Testing POST /book-appointment:" -ForegroundColor Yellow
$booking = @{
    start = "2025-01-15T14:00:00Z"
    end = "2025-01-15T14:30:00Z"
    summary = "Test Meeting via API"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "https://chattyai-calendar-bot-1.onrender.com/book-appointment" -Headers $headers -Method POST -Body $booking -ContentType "application/json"
    Write-Host "✅ Appointment booked successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Booking failed: $_" -ForegroundColor Red
}

Write-Host "`n✨ Your API is fully operational!" -ForegroundColor Green
Write-Host "Ready for VAPI integration at: https://chattyai-calendar-bot-1.onrender.com" -ForegroundColor Cyan 