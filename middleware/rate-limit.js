const redis = require('redis');
const { getRedisUrl } = require('../lib/redis');

/**
 * Production-ready rate limiting middleware
 * Supports both in-memory and Redis-based rate limiting
 */

// In-memory store for development/fallback
const memoryStore = new Map();

// Redis client setup
let redisClient;
if (getRedisUrl(['RATE_LIMIT_REDIS_URL'])) {
  redisClient = redis.createClient({
    url: getRedisUrl(['RATE_LIMIT_REDIS_URL']),
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis connection failed after 10 retries');
          return new Error('Redis connection failed');
        }
        return Math.min(retries * 100, 3000);
      }
    }
  });

  redisClient.on('error', (err) => {
    console.error('Redis error:', err);
  });

  redisClient.on('connect', () => {
    console.log('✅ Connected to Redis for rate limiting');
  });

  redisClient.connect().catch(console.error);
}

/**
 * Rate limiter configuration
 */
const defaultConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit headers
  keyGenerator: (req) => {
    // Use JWT api_key if available, otherwise IP
    if (req.tenant && req.tenant.api_key) {
      return `tenant:${req.tenant.api_key}`;
    }
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
};

/**
 * Store interface for rate limiting
 */
class RateLimitStore {
  constructor(windowMs) {
    this.windowMs = windowMs;
  }

  async increment(key) {
    if (redisClient && redisClient.isReady) {
      return this.incrementRedis(key);
    }
    return this.incrementMemory(key);
  }

  async incrementRedis(key) {
    const now = Date.now();
    const window = Math.floor(now / this.windowMs);
    const redisKey = `rate:${key}:${window}`;

    try {
      const pipeline = redisClient.multi();
      pipeline.incr(redisKey);
      pipeline.expire(redisKey, Math.ceil(this.windowMs / 1000));
      const results = await pipeline.exec();
      
      return {
        totalHits: results[0],
        resetTime: (window + 1) * this.windowMs
      };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      // Fallback to memory
      return this.incrementMemory(key);
    }
  }

  incrementMemory(key) {
    const now = Date.now();
    const window = Math.floor(now / this.windowMs);
    const storeKey = `${key}:${window}`;

    // Clean old entries
    for (const [k, v] of memoryStore.entries()) {
      if (v.expires < now) {
        memoryStore.delete(k);
      }
    }

    const current = memoryStore.get(storeKey) || { hits: 0, expires: (window + 1) * this.windowMs };
    current.hits++;
    memoryStore.set(storeKey, current);

    return {
      totalHits: current.hits,
      resetTime: current.expires
    };
  }
}

/**
 * Create rate limiting middleware
 */
function createRateLimiter(options = {}) {
  const config = { ...defaultConfig, ...options };
  const store = new RateLimitStore(config.windowMs);

  return async (req, res, next) => {
    try {
      const key = config.keyGenerator(req);
      const { totalHits, resetTime } = await store.increment(key);

      req.rateLimit = {
        limit: config.max,
        current: totalHits,
        remaining: Math.max(0, config.max - totalHits),
        resetTime: resetTime
      };

      // Set headers
      if (config.standardHeaders) {
        res.setHeader('RateLimit-Limit', config.max);
        res.setHeader('RateLimit-Remaining', req.rateLimit.remaining);
        res.setHeader('RateLimit-Reset', new Date(resetTime).toISOString());
        res.setHeader('RateLimit-Reset-Time', resetTime);
      }

      // Check if limit exceeded
      if (totalHits > config.max) {
        req.rateLimit.exceeded = true;
        return config.handler(req, res);
      }

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // In case of error, allow request to proceed
      next();
    }
  };
}

/**
 * Preset rate limiters for different endpoints
 */
const rateLimiters = {
  // Strict limit for authentication endpoints
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts',
    keyGenerator: (req) => req.ip // Always use IP for auth
  }),

  // Standard API limit
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // 100 requests per window
  }),

  // Relaxed limit for read operations
  read: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300 // 300 requests per window
  }),

  // Strict limit for write operations
  write: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20 // 20 requests per window
  }),

  // Very strict limit for expensive operations
  expensive: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10 // 10 requests per hour
  })
};

/**
 * Skip rate limiting for certain conditions
 */
function skipRateLimit(options = {}) {
  return (req, res, next) => {
    // Skip for health checks
    if (req.path === '/health') {
      return next();
    }

    // Skip for whitelisted IPs
    if (options.whitelist && options.whitelist.includes(req.ip)) {
      return next();
    }

    // Skip for internal requests
    if (req.headers['x-internal-request'] === process.env.INTERNAL_SECRET) {
      return next();
    }

    // Apply rate limiting
    return options.limiter(req, res, next);
  };
}

module.exports = {
  createRateLimiter,
  rateLimiters,
  skipRateLimit,
  
  // Convenience exports
  authLimiter: rateLimiters.auth,
  apiLimiter: rateLimiters.api,
  readLimiter: rateLimiters.read,
  writeLimiter: rateLimiters.write,
  expensiveLimiter: rateLimiters.expensive
}; 