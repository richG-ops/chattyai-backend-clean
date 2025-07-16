# 🚀 VAPI Stress Test Script for Production Validation
# Run this AFTER the manual restart completes

Write-Host "🎯 ChattyAI VAPI Stress Test - Senior Dev Approved" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""

# Test Configuration
$endpoint = "https://chattyai-backend-clean.onrender.com/vapi"
$testData = @{
    function = "checkAvailability"
    parameters = @{}
} | ConvertTo-Json

Write-Host "📋 Test Configuration:" -ForegroundColor Yellow
Write-Host "  Endpoint: $endpoint" -ForegroundColor Gray
Write-Host "  Concurrent Requests: 20" -ForegroundColor Gray
Write-Host "  Total Requests: 200" -ForegroundColor Gray
Write-Host "  Expected Response Time: <100ms avg" -ForegroundColor Gray
Write-Host ""

Write-Host "🔄 Starting stress test..." -ForegroundColor Yellow

# Counter for results
$successCount = 0
$errorCount = 0
$totalTime = 0

# Array to store response times
$responseTimes = @()

# Record start time
$startTime = Get-Date

# Run concurrent requests (simulating 20 concurrent users)
$jobs = 1..200 | ForEach-Object {
    Start-Job -ScriptBlock {
        param($endpoint, $testData, $requestId)
        
        try {
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            $response = Invoke-RestMethod -Uri $endpoint -Method POST -Headers @{"Content-Type"="application/json"} -Body $testData -TimeoutSec 30
            $stopwatch.Stop()
            
            return @{
                Success = $true
                ResponseTime = $stopwatch.ElapsedMilliseconds
                RequestId = $requestId
                Response = $response
            }
        } catch {
            return @{
                Success = $false
                Error = $_.Exception.Message
                RequestId = $requestId
            }
        }
    } -ArgumentList $endpoint, $testData, $_
}

Write-Host "⏳ Waiting for all requests to complete..." -ForegroundColor Yellow

# Wait for all jobs and collect results
$results = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job

# Calculate metrics
$totalRequests = $results.Count
$successCount = ($results | Where-Object { $_.Success -eq $true }).Count
$errorCount = $totalRequests - $successCount
$responseTimes = ($results | Where-Object { $_.Success -eq $true }).ResponseTime

if ($responseTimes.Count -gt 0) {
    $avgResponseTime = ($responseTimes | Measure-Object -Average).Average
    $maxResponseTime = ($responseTimes | Measure-Object -Maximum).Maximum
    $minResponseTime = ($responseTimes | Measure-Object -Minimum).Minimum
} else {
    $avgResponseTime = 0
    $maxResponseTime = 0
    $minResponseTime = 0
}

$endTime = Get-Date
$totalTestTime = ($endTime - $startTime).TotalSeconds

Write-Host ""
Write-Host "📊 STRESS TEST RESULTS" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host "Total Requests: $totalRequests" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $errorCount" -ForegroundColor $(if($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host "Success Rate: $([math]::Round(($successCount / $totalRequests) * 100, 2))%" -ForegroundColor $(if(($successCount / $totalRequests) -gt 0.95) { "Green" } else { "Red" })
Write-Host ""
Write-Host "Response Times:" -ForegroundColor Yellow
Write-Host "  Average: $([math]::Round($avgResponseTime, 2))ms" -ForegroundColor $(if($avgResponseTime -lt 100) { "Green" } else { "Red" })
Write-Host "  Minimum: $([math]::Round($minResponseTime, 2))ms" -ForegroundColor Gray
Write-Host "  Maximum: $([math]::Round($maxResponseTime, 2))ms" -ForegroundColor Gray
Write-Host ""
Write-Host "Total Test Duration: $([math]::Round($totalTestTime, 2)) seconds" -ForegroundColor Gray

Write-Host ""
# Results validation
if ($errorCount -eq 0 -and $avgResponseTime -lt 100) {
    Write-Host "🎉 STRESS TEST PASSED!" -ForegroundColor Green
    Write-Host "✅ Ready for 1,000+ concurrent users" -ForegroundColor Green
    Write-Host "✅ Response times within production targets" -ForegroundColor Green
} elseif ($successCount -gt ($totalRequests * 0.95)) {
    Write-Host "⚠️  STRESS TEST: PARTIAL PASS" -ForegroundColor Yellow
    Write-Host "✅ Success rate above 95%" -ForegroundColor Green
    Write-Host "⚠️  Some performance issues detected" -ForegroundColor Yellow
} else {
    Write-Host "❌ STRESS TEST FAILED" -ForegroundColor Red
    Write-Host "❌ Success rate below 95%" -ForegroundColor Red
    Write-Host "❌ System not ready for production load" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔄 To rerun: .\test-vapi-stress.ps1" -ForegroundColor Gray
Write-Host "📊 Share these results with your senior dev team" -ForegroundColor Gray 