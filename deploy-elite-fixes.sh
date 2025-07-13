#!/bin/bash

echo "🚀 ChattyAI Elite Production Deployment Script"
echo "============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to prompt for confirmation
confirm() {
    read -p "$1 (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
}

echo "This script will deploy the elite production fixes:"
echo "✅ Clean entry point with no circular dependencies"
echo "✅ Structured Q&A extraction and storage"
echo "✅ Proper idempotency with database backing"
echo "✅ Dead Letter Queue processor with Sentry alerts"
echo "✅ Per-request tenant isolation"
echo "✅ Paid Redis tier configuration"
echo ""

confirm "Ready to proceed?"

echo -e "\n${YELLOW}Step 1: Running smoke test locally${NC}"
npm run smoke-test
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Smoke test failed! Fix errors before deploying.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Smoke test passed${NC}"

echo -e "\n${YELLOW}Step 2: Committing all changes${NC}"
git add -A
git commit -m "Elite production fixes: Clean architecture, Q&A extraction, DLQ, tenant isolation"
echo -e "${GREEN}✅ Changes committed${NC}"

echo -e "\n${YELLOW}Step 3: Pushing to GitHub${NC}"
git push origin main
echo -e "${GREEN}✅ Pushed to GitHub${NC}"

echo -e "\n${YELLOW}Step 4: Render Deployment Instructions${NC}"
echo "1. Go to https://dashboard.render.com"
echo "2. Navigate to your ChattyAI project"
echo ""
echo "3. CRITICAL: Add these environment variables:"
echo "   - SENTRY_DSN (get from https://sentry.io)"
echo "   - VAPI_WEBHOOK_SECRET (generate a secure random string)"
echo "   - VAPI_API_KEY (from your Vapi dashboard)"
echo "   - TWILIO_ACCOUNT_SID"
echo "   - TWILIO_AUTH_TOKEN"
echo "   - TWILIO_FROM_NUMBER"
echo ""
echo "4. Create Redis instance:"
echo "   - Click 'New' → 'Redis'"
echo "   - Name: chattyai-redis"
echo "   - Plan: Standard ($15/month)"
echo "   - Region: Oregon (same as app)"
echo ""
echo "5. The deployment will auto-trigger when you push"
echo ""

confirm "Have you completed the Render setup?"

echo -e "\n${YELLOW}Step 5: Running database migrations${NC}"
echo "Once deployment is complete, run:"
echo "  render exec chattyai-backend -- npx knex migrate:latest"
echo ""

confirm "Have you run the migrations?"

echo -e "\n${YELLOW}Step 6: Update Vapi webhook URL${NC}"
echo "1. Go to https://dashboard.vapi.ai"
echo "2. Navigate to your assistant settings"
echo "3. Update webhook URL to:"
echo "   https://chattyai-backend-clean.onrender.com/api/v1/webhook"
echo ""

confirm "Have you updated the Vapi webhook URL?"

echo -e "\n${YELLOW}Step 7: Running synthetic canary test${NC}"
echo "Make a test call to your Vapi number and verify:"
echo "- Call is received and logged"
echo "- Q&A pairs are extracted"
echo "- SMS/Email notifications are sent"
echo "- No errors in logs"
echo ""

confirm "Did the canary test pass?"

echo -e "\n${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo ""
echo "Your ChattyAI system now has:"
echo "✅ Deterministic, idempotent voice pipeline"
echo "✅ Structured Q&A data for dashboards"
echo "✅ Resilient job system with DLQ"
echo "✅ Tenant-safe PostgreSQL with RLS"
echo "✅ Enterprise-grade monitoring"
echo ""
echo "Next steps:"
echo "1. Monitor https://dashboard.render.com for any errors"
echo "2. Check Sentry for any exceptions"
echo "3. Verify Redis queue processing in logs"
echo "4. Test with a real customer call"
echo ""
echo "🚀 You're now running elite production infrastructure!" 