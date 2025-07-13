#!/usr/bin/env node

/**
 * Cleanup script for processed_webhooks table
 * Run via cron: 0 * * * * node /app/scripts/cleanup-webhooks.js
 */

require('dotenv').config();
const knex = require('knex')(require('../knexfile'));

async function cleanup() {
  const startTime = Date.now();
  
  try {
    // Delete records older than 24 hours
    const deleted = await knex('processed_webhooks')
      .where('received_at', '<', knex.raw("NOW() - INTERVAL '24 hours'"))
      .delete();
    
    // Vacuum analyze to reclaim space and update stats
    if (deleted > 0) {
      await knex.raw('VACUUM ANALYZE processed_webhooks');
    }
    
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Cleanup complete: ${deleted} records deleted in ${duration}ms`);
    
    // Alert if table is getting too large
    const count = await knex('processed_webhooks').count('* as total');
    const total = parseInt(count[0].total);
    
    if (total > 100000) {
      console.warn(`⚠️ WARNING: processed_webhooks table has ${total} records - check retention policy`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Cleanup failed:`, error);
    process.exit(1);
  }
}

// Run cleanup
cleanup(); 