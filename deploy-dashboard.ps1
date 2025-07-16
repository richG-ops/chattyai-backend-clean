# ============================================================================
# DEPLOY NEXT.JS DASHBOARD TO VERCEL
# ============================================================================

Write-Host "`n🚀 DEPLOYING CHATTYAI DASHBOARD TO VERCEL" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Step 1: Navigate to frontend directory
Write-Host "`n📋 Step 1: Navigating to frontend directory..." -ForegroundColor Yellow
cd thechattyai-frontend

# Step 2: Check if Vercel CLI is installed
Write-Host "`n📋 Step 2: Checking Vercel CLI..." -ForegroundColor Yellow
try {
    vercel --version | Out-Null
    Write-Host "✅ Vercel CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "📦 Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

# Step 3: Create environment file
Write-Host "`n📋 Step 3: Creating environment configuration..." -ForegroundColor Yellow
@"
# Backend API Configuration
NEXT_PUBLIC_API_URL=https://chattyai-backend-clean.onrender.com
CALENDAR_API_URL=https://chattyai-backend-clean.onrender.com

# Authentication
JWT_SECRET=your-super-secret-jwt-key-$(Get-Random)
NEXTAUTH_SECRET=your-nextauth-secret-key-$(Get-Random)
NEXTAUTH_URL=https://your-app.vercel.app

# Default credentials for demo
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000000
"@ | Out-File -FilePath ".env.production" -Encoding UTF8

Write-Host "✅ Environment file created" -ForegroundColor Green

# Step 4: Build the project
Write-Host "`n📋 Step 4: Building the project..." -ForegroundColor Yellow
npm install
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed successfully" -ForegroundColor Green

# Step 5: Deploy to Vercel
Write-Host "`n📋 Step 5: Deploying to Vercel..." -ForegroundColor Yellow
Write-Host "You'll be prompted to:" -ForegroundColor Cyan
Write-Host "1. Login to Vercel (if not already)" -ForegroundColor White
Write-Host "2. Link to an existing project or create new" -ForegroundColor White
Write-Host "3. Configure project settings" -ForegroundColor White
Write-Host ""

# Deploy with production flag
vercel --prod

# Step 6: Show success message
Write-Host "`n
╔═══════════════════════════════════════════════════════════╗
║                  🎉 DEPLOYMENT COMPLETE!                    ║
╚═══════════════════════════════════════════════════════════╝

Your dashboard is now live at one of these URLs:

1. https://thechattyai-frontend.vercel.app
2. https://YOUR-PROJECT-NAME.vercel.app
3. Custom domain (if configured)

📊 Dashboard Features:
   • Real-time call analytics
   • Booking management
   • Customer insights
   • AI assistant monitoring

🔐 Default Login:
   Email: demo@business.com
   Password: (not required for demo)

📝 Next Steps:
1. Visit your dashboard URL
2. Complete onboarding flow
3. View live call data
4. Configure custom domain

" -ForegroundColor Green

# Return to root directory
cd .. 