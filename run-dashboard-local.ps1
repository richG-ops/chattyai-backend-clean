# ============================================================================
# RUN DASHBOARD LOCALLY
# ============================================================================

Write-Host "`n🏠 RUNNING CHATTYAI DASHBOARD LOCALLY" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Navigate to frontend
cd thechattyai-frontend

# Create local environment file
Write-Host "`n📋 Creating local environment..." -ForegroundColor Yellow
@"
# Local development configuration
NEXT_PUBLIC_API_URL=https://chattyai-backend-clean.onrender.com
CALENDAR_API_URL=https://chattyai-backend-clean.onrender.com

# Auth (local)
JWT_SECRET=local-dev-secret-key
NEXTAUTH_SECRET=local-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Default tenant
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000000
"@ | Out-File -FilePath ".env.local" -Encoding UTF8

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Start development server
Write-Host "`n🚀 Starting development server..." -ForegroundColor Green
Write-Host "Dashboard will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

npm run dev 