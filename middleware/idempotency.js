const crypto = require('crypto');
const { getDb } = require('../db-config');

// Get database instance with proper connection pooling
let knex;
try {
  knex = getDb();
} catch (error) {
  console.warn('Database not configured, idempotency disabled:', error.message);
  knex = null;
}

// Middleware to ensure idempotency for webhook requests
const idempotencyMiddleware = async (req, res, next) => {
  // Skip if no database
  if (!knex) {
    return next();
  }

  // Only apply to webhook endpoints
  if (!req.path.includes('/vapi')) {
    return next();
  }

  try {
    // Get or generate request ID
    const requestId = req.headers['x-vapi-request-id'] || 
                     req.headers['x-request-id'] || 
                     crypto.randomUUID();

    // Store request ID for later
    req.requestId = requestId;
    
    // Try to insert with ON CONFLICT for atomic check
    const inserted = await knex.raw(`
      INSERT INTO processed_webhooks (request_id, function_name, parameters, received_at)
      VALUES (?, ?, ?, NOW())
      ON CONFLICT (request_id) 
      DO UPDATE SET request_id = EXCLUDED.request_id
      RETURNING (xmax = 0) AS inserted
    `, [requestId, req.body?.function || 'unknown', JSON.stringify(req.body?.parameters || {})]);
    
    // If not inserted (already existed), return cached response
    if (!inserted.rows[0].inserted) {
      const existing = await knex('processed_webhooks')
        .where('request_id', requestId)
        .first();
      
      if (existing?.response) {
        console.log(`🔁 Duplicate webhook request detected: ${requestId}`);
        return res.status(200).json({
          ...existing.response,
          duplicate: true
        });
      }
    }
    
    // Override res.json to capture and update response
    const originalJson = res.json.bind(res);
    res.json = async function(data) {
      try {
        // Update with the response
        await knex('processed_webhooks')
          .where('request_id', requestId)
          .update({
            response: data
          });

        // Clean up old entries (older than 24 hours) - do this async
        setImmediate(async () => {
          try {
            const deleted = await knex('processed_webhooks')
              .where('received_at', '<', knex.raw("NOW() - INTERVAL '24 hours'"))
              .delete();
            if (deleted > 0) {
              console.log(`🧹 Cleaned up ${deleted} old webhook records`);
            }
          } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
          }
        });
      } catch (error) {
        console.error('Error storing webhook response:', error);
      }

      return originalJson(data);
    };

    next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    // Continue processing even if idempotency check fails
    next();
  }
};

module.exports = idempotencyMiddleware; 