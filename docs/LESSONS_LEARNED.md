# LESSONS LEARNED - TheChattyAI Production Issues

## Last Updated: 2025-01-11

### 🚨 CRITICAL PRODUCTION ISSUES (CURRENT)

**Date: 2025-01-11** 
**Issue:** Voice agent calls not registering, /vapi endpoint 404
**Impact:** Complete voice booking system down, customers can't book appointments
**Root Cause:** Edited wrong file (server-simple.js) when production runs google-calendar-api.js

**DEPLOYMENT LESSON:** Always check package.json "main" field before editing!
- Production runs: google-calendar-api.js
- I edited: server-simple.js  
- Result: Changes never deployed to production

**URLs Currently Failing:**
- `https://chattyai-calendar-bot-1.onrender.com/healthz` → 404 Not Found
- `https://thechattyai-api.onrender.com/healthz` → Connection/DNS issues
- `https://app.thechattyai.com/api/health` → DNS resolution failure

**✅ WORKING PRODUCTION URL DISCOVERED:**
- `https://chattyai-backend-clean.onrender.com/healthz` → 200 OK ✅
- Service: "thechattyai-calendar-api" v1.0.0 in production environment
- Uptime: Active and healthy

**🔍 ROOT CAUSE IDENTIFIED:**
**Production/Development Server Mismatch:**
- package.json defines `server-minimal.js` as main entry point
- Production actually runs `google-calendar-api.js` (full-featured server)
- CI/CD references `google-calendar-api.js` in health checks
- Multiple URL patterns used inconsistently across codebase

**Action Required:**
1. ✅ Verify actual Render service URLs → `https://chattyai-backend-clean.onrender.com`
2. Fix DNS CNAME records for app.thechattyai.com
   **Instructions for Wix DNS:**
   - Go to Domains in Wix account → Domain Actions → Manage DNS Records
   - Add CNAME record: Host Name: "app", Value: "chattyai-backend-clean.onrender.com"
   - Wait up to 24 hours for DNS propagation
3. Standardize URL references across all configuration files  
4. ✅ Test all health endpoints → Working on chattyai-backend-clean.onrender.com
5. **NEW:** Fix package.json main entry point to match production deployment

---

### 🔧 ESTABLISHED LESSONS

**Always seed prod DB before hitting API.**
- Issue: 403 errors due to missing tenant rows
- Solution: Create seed scripts and run before deployment
- Prevention: Add DB seeding to CI/CD pipeline

**Test /healthz in CI post-deploy.**
- Issue: Silent service failures not detected
- Solution: Add health check verification in GitHub Actions
- Prevention: Automated rollback on health check failure

**Render env-vars never hard-code secrets; rotate quarterly.**
- Issue: Exposed secrets in configuration files
- Solution: Use Render's secret management
- Prevention: Regular secret rotation schedule

**Blue/green deploy prevents downtime; enable automatic rollback.**
- Issue: Deployment failures causing service outages
- Solution: Implement blue/green deployment strategy
- Prevention: Automatic rollback on deployment failure

**Keep Wix DNS TTL ≤ 60 m for quick cut-over.**
- Issue: Long DNS propagation delays during outages
- Solution: Set DNS TTL to 60 minutes maximum
- Prevention: Test DNS changes in staging environment

---

### 🎯 IMMEDIATE ACTIONS NEEDED

1. **Fix Production Health Endpoints** (Priority 1)
   - Verify correct Render service URLs
   - Test all health endpoints
   - Update CI/CD health checks

2. **Fix DNS Configuration** (Priority 1)
   - Verify app.thechattyai.com CNAME record
   - Test DNS resolution from multiple locations
   - Update Wix DNS settings if needed

3. **Standardize URL Configuration** (Priority 2)
   - Create single source of truth for all URLs
   - Update all configuration files to use consistent URLs
   - Document URL patterns in ADR

4. **Add Missing Monitoring** (Priority 3)
   - Set up Sentry error tracking
   - Add uptime monitoring
   - Create alerts for health check failures

---

### 🎯 NEXT THREE HIGH-IMPACT TASKS

**Priority 1: Configuration Standardization & Deployment Consistency**
- Standardize all URL references across codebase to use `chattyai-backend-clean.onrender.com`
- Create environment-specific configuration files (dev, staging, prod)
- Update render.yaml to match actual deployed service names
- Implement proper CI/CD deployment verification with health checks
- **Impact:** Eliminates deployment confusion, prevents 404 errors, ensures consistent deployments

**Priority 2: Production Monitoring & Alerting Setup**
- Set up Sentry error tracking for production environment
- Implement uptime monitoring with PagerDuty or similar
- Create comprehensive health check endpoints (/healthz, /readiness, /liveness)
- Add performance metrics and logging aggregation
- Set up alerts for health check failures, high error rates, slow response times
- **Impact:** Proactive issue detection, faster incident response, improved uptime SLA

**Priority 3: Scalability & Performance Optimization**
- Implement auto-scaling based on CPU/memory usage (currently 2-10 instances)
- Add Redis caching for frequently accessed data
- Optimize database queries and add connection pooling
- Implement rate limiting and request queuing
- Add CDN for static assets and API responses
- **Impact:** Handles 10k+ concurrent users, reduces response times, prevents cascading failures

---

### 📋 VERIFICATION CHECKLIST

Before considering any production issue resolved:

- [x] Health endpoint returns 200 with proper JSON response
- [ ] DNS resolution works from multiple locations (pending Wix DNS update)
- [ ] CI/CD pipeline includes health check verification
- [x] All configuration files use consistent URL patterns (package.json fixed)
- [ ] Monitoring and alerting are configured
- [ ] Rollback procedure is tested and documented 