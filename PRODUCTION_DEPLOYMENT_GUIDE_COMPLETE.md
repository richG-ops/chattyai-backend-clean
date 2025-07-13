# 🚀 **PRODUCTION DEPLOYMENT GUIDE - 10,000 CALLS/DAY**

## **📋 PRE-DEPLOYMENT CHECKLIST**

### **Infrastructure Requirements**
- [ ] PostgreSQL 15+ with connection pooling (100+ connections)
- [ ] Redis Cluster (6GB+ RAM for queue management)
- [ ] Node.js 20 LTS
- [ ] Load balancer (Cloudflare/AWS ALB)
- [ ] SSL certificates
- [ ] Domain with DNS configured

### **API Keys & Credentials**
- [ ] Vapi.ai API key and assistant configured
- [ ] Twilio account with SMS enabled
- [ ] Google Calendar API credentials
- [ ] Sentry DSN for monitoring
- [ ] SendGrid/AWS SES for email fallback

---

## **🛠️ STEP 1: DATABASE SETUP**

### **PostgreSQL Configuration**
```bash
# Connect to your production database
psql $DATABASE_URL

# Configure for high performance
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET work_mem = '10MB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

# Apply changes
SELECT pg_reload_conf();
```

### **Run Migrations**
```bash
# Set production database URL
export DATABASE_URL=postgres://user:pass@host:5432/chattyai_prod
export NODE_ENV=production

# Run all migrations
npx knex migrate:latest --env production

# Verify migrations
npx knex migrate:status
```

### **Create Indexes for Performance**
```sql
-- Additional performance indexes
CREATE INDEX CONCURRENTLY idx_calls_phone_date ON calls(phone_number, started_at);
CREATE INDEX CONCURRENTLY idx_bookings_date_status ON bookings(appointment_date, status);
CREATE INDEX CONCURRENTLY idx_customers_phone_email ON customers(phone, email);
CREATE INDEX CONCURRENTLY idx_leads_tenant_status ON leads(tenant_id, status, created_at);

-- Partial indexes for common queries
CREATE INDEX CONCURRENTLY idx_bookings_upcoming ON bookings(appointment_date) 
  WHERE status = 'confirmed' AND appointment_date > NOW();
```

---

## **🔧 STEP 2: REDIS SETUP**

### **Redis Configuration**
```bash
# redis.conf for production
maxmemory 6gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Enable Redis persistence
dir /var/lib/redis
dbfilename dump.rdb
```

### **Redis Cluster Setup (for scale)**
```bash
# Create 6 Redis nodes (3 masters, 3 replicas)
redis-cli --cluster create \
  10.0.0.1:7000 10.0.0.2:7000 10.0.0.3:7000 \
  10.0.0.4:7000 10.0.0.5:7000 10.0.0.6:7000 \
  --cluster-replicas 1
```

---

## **📦 STEP 3: APPLICATION DEPLOYMENT**

### **Environment Variables**
```env
# Core
NODE_ENV=production
PORT=4000

# Database
DATABASE_URL=postgres://user:pass@host:5432/chattyai_prod

# Redis
REDIS_URL=redis://:password@redis-cluster:6379
REDIS_HOST=redis-cluster
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Vapi
VAPI_WEBHOOK_URL=https://your-domain.com/vapi-webhook

# Twilio
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_FROM_NUMBER=+1234567890

# Email
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
SENDGRID_API_KEY=your-sendgrid-key

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx

# Owner notifications
OWNER_PHONE=7027760084
OWNER_EMAIL=richard.gallagherxyz@gmail.com
```

### **Docker Deployment**
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Run migrations on startup
CMD ["sh", "-c", "npx knex migrate:latest && npm start"]
```

### **Docker Compose (Full Stack)**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
  
  worker:
    build: .
    command: node workers/index.js
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: chattyai_prod
      POSTGRES_USER: chattyai
      POSTGRES_PASSWORD: secure-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
  
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G

volumes:
  postgres_data:
  redis_data:
```

---

## **⚡ STEP 4: PERFORMANCE OPTIMIZATION**

### **PM2 Configuration**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'chattyai-api',
      script: 'google-calendar-api.js',
      instances: 4, // CPU cores
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      max_memory_restart: '1G',
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      merge_logs: true
    },
    {
      name: 'chattyai-worker',
      script: 'workers/index.js',
      instances: 2,
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

### **Nginx Configuration**
```nginx
upstream chattyai_backend {
    least_conn;
    server 127.0.0.1:4000 weight=10 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:4001 weight=10 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:4002 weight=10 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:4003 weight=10 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    server_name api.chattyai.com;
    
    ssl_certificate /etc/ssl/certs/chattyai.crt;
    ssl_certificate_key /etc/ssl/private/chattyai.key;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
    limit_req zone=api burst=200 nodelay;
    
    location / {
        proxy_pass http://chattyai_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://chattyai_backend/health;
        access_log off;
    }
}
```

---

## **📊 STEP 5: MONITORING SETUP**

### **Sentry Configuration**
```javascript
// In your main application file
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new ProfilingIntegration(),
  ],
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  beforeSend(event, hint) {
    // Filter out expected errors
    if (event.exception) {
      const error = hint.originalException;
      if (error?.statusCode === 429) return null; // Rate limit errors
    }
    return event;
  }
});
```

### **CloudWatch Metrics**
```javascript
// metrics.js
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

function sendMetric(name, value, unit = 'Count') {
  const params = {
    Namespace: 'ChattyAI',
    MetricData: [{
      MetricName: name,
      Value: value,
      Unit: unit,
      Timestamp: new Date()
    }]
  };
  
  cloudwatch.putMetricData(params).promise();
}

// Usage
sendMetric('BookingsProcessed', 1);
sendMetric('CallDuration', 120, 'Seconds');
sendMetric('QueueBacklog', queueSize);
```

---

## **🚀 STEP 6: DEPLOYMENT COMMANDS**

### **Initial Deployment**
```bash
# 1. Clone and setup
git clone https://github.com/yourusername/chattyai-calendar-bot.git
cd chattyai-calendar-bot
npm install

# 2. Build and test
npm run test
npm run build

# 3. Database setup
npx knex migrate:latest
npx knex seed:run

# 4. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 5. Setup log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
```

### **Update Deployment**
```bash
# Zero-downtime deployment
git pull origin main
npm install
npx knex migrate:latest
pm2 reload ecosystem.config.js --env production
```

---

## **🔍 STEP 7: VAPI CONFIGURATION**

### **Update Vapi Dashboard**
1. Go to https://dashboard.vapi.ai
2. Select your assistant
3. Update webhook URL to: `https://your-domain.com/vapi-webhook`
4. Update functions as shown in the code
5. Test with a call

### **Vapi Function Configuration**
```json
{
  "functions": [
    {
      "name": "bookAppointment",
      "description": "Book an appointment",
      "parameters": {
        "type": "object",
        "properties": {
          "customerName": { "type": "string" },
          "customerPhone": { "type": "string" },
          "customerEmail": { "type": "string" },
          "serviceType": { "type": "string" },
          "date": { "type": "string" },
          "time": { "type": "string" }
        },
        "required": ["customerName", "customerPhone", "date", "time"]
      }
    }
  ]
}
```

---

## **📈 STEP 8: SCALING CHECKLIST**

### **For 100 Clients**
- [ ] Single server (4 CPU, 8GB RAM)
- [ ] Basic PostgreSQL
- [ ] Single Redis instance

### **For 1,000 Clients**
- [ ] Load balanced servers (3x 8CPU, 16GB RAM)
- [ ] PostgreSQL with read replicas
- [ ] Redis Cluster
- [ ] CDN for static assets

### **For 10,000+ Clients**
- [ ] Auto-scaling groups
- [ ] Multi-region deployment
- [ ] Database sharding
- [ ] Dedicated queue servers
- [ ] ElasticSearch for search
- [ ] Dedicated monitoring infrastructure

---

## **🚨 MONITORING & ALERTS**

### **Set Up Alerts For:**
- Response time > 1 second
- Error rate > 1%
- Queue backlog > 1000 jobs
- Database connections > 80%
- Redis memory > 80%
- Disk usage > 80%

### **Dashboard Queries**
```sql
-- Real-time call volume
SELECT DATE_TRUNC('hour', started_at) as hour,
       COUNT(*) as calls,
       COUNT(CASE WHEN appointment_booked THEN 1 END) as bookings
FROM calls
WHERE started_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Customer retention
SELECT COUNT(DISTINCT customer_id) as total_customers,
       COUNT(DISTINCT CASE WHEN total_bookings > 1 THEN customer_id END) as returning
FROM customers
WHERE created_at > NOW() - INTERVAL '30 days';
```

---

## **✅ POST-DEPLOYMENT VERIFICATION**

```bash
# 1. Health check
curl https://your-domain.com/health

# 2. Test webhook
curl -X POST https://your-domain.com/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{"function":"checkAvailability","parameters":{"date":"tomorrow"}}'

# 3. Monitor logs
pm2 logs

# 4. Check metrics
pm2 monit

# 5. Database status
psql $DATABASE_URL -c "SELECT COUNT(*) FROM calls WHERE started_at > NOW() - INTERVAL '1 hour';"
```

---

## **🔥 EMERGENCY PROCEDURES**

### **High Load**
```bash
# Scale workers
pm2 scale chattyai-worker +2

# Increase database connections
ALTER SYSTEM SET max_connections = 400;
SELECT pg_reload_conf();
```

### **Database Issues**
```bash
# Kill long-running queries
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';
```

### **Queue Backlog**
```bash
# Clear failed jobs
node scripts/clear-failed-jobs.js

# Pause non-critical queues
node scripts/pause-analytics-queue.js
```

---

## **📞 SUPPORT CONTACTS**

- **Vapi Support**: support@vapi.ai
- **Twilio Emergency**: +1-415-390-2337
- **Your DevOps Lead**: [Your contact]
- **Database Admin**: [DBA contact]

**🎯 TARGET: 99.9% UPTIME | <500ms RESPONSE TIME | 10,000 CALLS/DAY** 