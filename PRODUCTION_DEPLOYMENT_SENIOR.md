# 🚀 Senior-Level Production Deployment

## What We Fixed (No BS)

### 1. **Idempotency** - PostgreSQL UPSERT pattern
```sql
INSERT INTO processed_webhooks (request_id, function_name, parameters)
VALUES ($1, $2, $3)
ON CONFLICT (request_id) DO UPDATE SET request_id = EXCLUDED.request_id
RETURNING (xmax = 0) AS inserted;
```

### 2. **Timezone** - Luxon with proper LA timezone
```javascript
const now = DateTime.now().setZone('America/Los_Angeles');
const tomorrow = now.plus({ days: 1 });
```

### 3. **Rate Limiting** - Bottleneck with backpressure
```javascript
const twilioLimiter = new Bottleneck({
  minTime: 1000,  // 1 TPS for unregistered
  reservoir: 60,   // Burst capacity
  reservoirRefreshInterval: 60000
});
```

### 4. **Monitoring** - Sentry with context
```javascript
Sentry.captureException(error, {
  tags: { component: 'sms' },
  extra: { to, messageLength }
});
```

## Deployment Steps

### 1. Push to GitHub
```bash
git add -A
git commit -m "feat: P0 fixes - idempotency, timezone, rate limiting, monitoring"
git push origin main
```

### 2. Render Environment Variables
Add these NOW:
```
SENTRY_DSN=https://YOUR_KEY@sentry.io/PROJECT_ID
TZ=America/Los_Angeles
```

### 3. Database Migration
SSH into Render or run locally with prod DATABASE_URL:
```bash
DATABASE_URL=postgres://... npx knex migrate:latest
```

### 4. Set Up Cron Job
Add to Render's cron jobs:
```
0 * * * * cd /opt/render/project/src && node scripts/cleanup-webhooks.js
```

### 5. Update Vapi
Change webhook URL:
- From: `/vapi`
- To: `/vapi-webhook`

## Monitoring

### Sentry Dashboard
Watch for:
- SMS failures (Twilio 429s)
- Database connection errors
- Timezone parsing failures

### Database Health
```sql
-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('processed_webhooks'));

-- Check cleanup is working
SELECT COUNT(*), MIN(received_at), MAX(received_at) 
FROM processed_webhooks;
```

### Rate Limiter Stats
Look for in logs:
```
📊 Twilio Limiter Stats: { executing: 1, queued: 4, done: 156 }
```

## Performance Expectations

- **Idempotency overhead**: ~5ms per request
- **Rate limiting**: Adds 0-1000ms delay based on queue
- **Database cleanup**: <100ms hourly
- **Memory impact**: +10MB for Bottleneck queues

## Rollback Plan

If shit hits the fan:
```bash
# 1. Disable idempotency temporarily
# Comment out: app.use(idempotencyMiddleware);

# 2. Remove rate limiting
# Replace twilioLimiter.schedule() with direct calls

# 3. Revert to native Date
git revert HEAD
```

## You're Live

Deploy, update Vapi, watch metrics. Real senior devs ship and monitor. 