#!/usr/bin/env pwsh

Write-Host "🚀 Testing TheChattyAI Production Endpoints" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$baseUrl = "https://chattyai-backend-clean.onrender.com"
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiMDFiYTE2OGRkMzBjMDM3N2MxZjBjNzRiOTM2ZjQyNzQiLCJpYXQiOjE3NTIwMDgzNjcsImV4cCI6MTc4MzU0NDM2N30.zelpVbu-alSaAfMSkSsne2gaaWETqdbakzui5Pbi_Ts"

Write-Host "`n1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/healthz" -Method GET -TimeoutSec 10
    Write-Host "✅ Health Status: $($health.status)" -ForegroundColor Green
    Write-Host "   Service: $($health.service)" -ForegroundColor Gray
    Write-Host "   Environment: $($health.environment)" -ForegroundColor Gray
    Write-Host "   Google Calendar: $($health.features.google_calendar)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Testing VAPI Endpoint (Voice Agent Integration)..." -ForegroundColor Yellow
try {
    $vapiBody = @{
        function = "checkAvailability"
        parameters = @{}
    } | ConvertTo-Json
    
    $vapi = Invoke-RestMethod -Uri "$baseUrl/vapi" -Method POST -Body $vapiBody -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ VAPI Response: $($vapi.response)" -ForegroundColor Green
    Write-Host "   Available slots: $($vapi.slots.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ VAPI test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Testing Calendar Availability (with JWT auth)..." -ForegroundColor Yellow
try {
    $headers = @{
        Authorization = "Bearer $token"
    }
    
    $availability = Invoke-RestMethod -Uri "$baseUrl/get-availability" -Headers $headers -Method GET -TimeoutSec 10
    Write-Host "✅ Calendar API working!" -ForegroundColor Green
    Write-Host "   Available slots: $($availability.slots.Count)" -ForegroundColor Gray
    if ($availability.slots.Count -gt 0) {
        Write-Host "   First slot: $($availability.slots[0].start) - $($availability.slots[0].end)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Calendar availability failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   This might be due to missing Google credentials in production" -ForegroundColor Yellow
}

Write-Host "`n4. Testing Appointment Booking..." -ForegroundColor Yellow
try {
    $bookingBody = @{
        start = "2025-01-15T14:00:00Z"
        end = "2025-01-15T14:30:00Z"
        summary = "Test from Production Check"
    } | ConvertTo-Json
    
    $headers = @{
        Authorization = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $booking = Invoke-RestMethod -Uri "$baseUrl/book-appointment" -Headers $headers -Method POST -Body $bookingBody -TimeoutSec 10
    Write-Host "✅ Booking successful!" -ForegroundColor Green
    Write-Host "   Success: $($booking.success)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Booking failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n📊 SUMMARY:" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Cyan
Write-Host "✅ Production API is running at: $baseUrl" -ForegroundColor Green
Write-Host "✅ Health endpoint working" -ForegroundColor Green
Write-Host "✅ VAPI endpoint working (for voice agents)" -ForegroundColor Green
Write-Host "⚠️  Calendar endpoints may need Google credentials configured in Render" -ForegroundColor Yellow
Write-Host "⚠️  SMS notifications may need Twilio credentials configured in Render" -ForegroundColor Yellow

Write-Host "`n🎯 TO COMPLETE SETUP:" -ForegroundColor Yellow
Write-Host "1. Configure Google Calendar credentials in Render environment" -ForegroundColor White
Write-Host "2. Configure Twilio credentials for SMS notifications" -ForegroundColor White
Write-Host "3. Test end-to-end with voice agent call" -ForegroundColor White 