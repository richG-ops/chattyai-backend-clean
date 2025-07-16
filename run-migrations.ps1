# Run Database Migrations
Write-Host "Running database migrations..." -ForegroundColor Yellow

# Check if we have DATABASE_URL
if (-not $env:DATABASE_URL) {
    Write-Host "Enter your DATABASE_URL from Render:" -ForegroundColor Cyan
    $env:DATABASE_URL = Read-Host
}

# Run knex migrations
Write-Host "Running migrations with knex..." -ForegroundColor Yellow
npx knex migrate:latest --env production

Write-Host "✅ Migrations complete!" -ForegroundColor Green 