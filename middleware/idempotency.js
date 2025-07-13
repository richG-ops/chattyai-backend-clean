const crypto = require('crypto');

// Middleware to ensure idempotency for webhook requests
const idempotencyMiddleware = async (req, res, next) => {
  // For now, just continue without idempotency until database is stable
  // This prevents the middleware from breaking the route
  console.log('📝 Webhook request received:', req.headers['x-vapi-request-id'] || 'no-id');
  return next();
};

module.exports = idempotencyMiddleware; 