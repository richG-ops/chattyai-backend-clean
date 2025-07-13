const express = require('express');
const router = express.Router();
const { getDb } = require('../db-config');
const { getQueueHealth } = require('../lib/job-queue');

// System health check endpoint
router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {}
  };
  
  try {
    // Check database
    const db = getDb();
    await db.raw('SELECT 1');
    health.checks.database = { status: 'healthy' };
  } catch (error) {
    health.checks.database = { status: 'unhealthy', error: error.message };
    health.status = 'degraded';
  }
  
  try {
    // Check Redis/Queues
    const queueHealth = await getQueueHealth();
    health.checks.queues = queueHealth;
    
    // Check if any queue has too many failed jobs
    for (const [name, stats] of Object.entries(queueHealth)) {
      if (stats.failed > 100) {
        health.status = 'degraded';
        health.alerts = health.alerts || [];
        health.alerts.push(`High failure rate in ${name} queue`);
      }
    }
  } catch (error) {
    health.checks.queues = { status: 'unhealthy', error: error.message };
    health.status = 'degraded';
  }
  
  // Return appropriate status code
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Real-time metrics endpoint
router.get('/metrics', async (req, res) => {
  const db = getDb();
  const { timeframe = '1h' } = req.query;
  
  try {
    const metrics = {};
    
    // Get time boundary
    const since = getTimeBoundary(timeframe);
    
    // Call metrics
    const callStats = await db('calls')
      .where('started_at', '>=', since)
      .select(
        db.raw('COUNT(*) as total'),
        db.raw('COUNT(CASE WHEN appointment_booked = true THEN 1 END) as booked'),
        db.raw('AVG(duration_seconds) as avg_duration'),
        db.raw('COUNT(CASE WHEN contains_complaint = true THEN 1 END) as complaints')
      )
      .first();
    
    metrics.calls = {
      total: parseInt(callStats.total),
      booked: parseInt(callStats.booked),
      conversionRate: callStats.total > 0 ? 
        (callStats.booked / callStats.total * 100).toFixed(1) : 0,
      avgDuration: Math.round(callStats.avg_duration || 0),
      complaints: parseInt(callStats.complaints)
    };
    
    // Booking metrics
    const bookingStats = await db('bookings')
      .where('created_at', '>=', since)
      .select(
        db.raw('COUNT(*) as total'),
        db.raw('COUNT(CASE WHEN status = \'confirmed\' THEN 1 END) as confirmed'),
        db.raw('COUNT(CASE WHEN status = \'cancelled\' THEN 1 END) as cancelled'),
        db.raw('COUNT(CASE WHEN status = \'no_show\' THEN 1 END) as no_shows')
      )
      .first();
    
    metrics.bookings = {
      total: parseInt(bookingStats.total),
      confirmed: parseInt(bookingStats.confirmed),
      cancelled: parseInt(bookingStats.cancelled),
      noShows: parseInt(bookingStats.no_shows)
    };
    
    // Customer metrics
    const customerStats = await db('customers')
      .where('created_at', '>=', since)
      .count('* as new_customers')
      .first();
    
    metrics.customers = {
      new: parseInt(customerStats.new_customers),
      returning: metrics.bookings.total - parseInt(customerStats.new_customers)
    };
    
    // Queue metrics
    const queueHealth = await getQueueHealth();
    metrics.queues = queueHealth;
    
    // Error rate
    const errorCount = await db('notification_logs')
      .where('created_at', '>=', since)
      .where('status', 'failed')
      .count('* as errors')
      .first();
    
    metrics.errorRate = {
      notifications: parseInt(errorCount.errors),
      percentage: metrics.bookings.total > 0 ?
        (parseInt(errorCount.errors) / metrics.bookings.total * 100).toFixed(1) : 0
    };
    
    res.json({
      timeframe,
      since: since.toISOString(),
      metrics
    });
    
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Live dashboard data (for real-time updates)
router.get('/dashboard', async (req, res) => {
  const db = getDb();
  
  try {
    // Recent calls (last 10)
    const recentCalls = await db('calls')
      .orderBy('started_at', 'desc')
      .limit(10)
      .select(
        'call_id',
        'phone_number',
        'started_at',
        'duration_seconds',
        'outcome',
        'appointment_booked',
        'ai_employee'
      );
    
    // Recent bookings (last 10)
    const recentBookings = await db('bookings')
      .orderBy('created_at', 'desc')
      .limit(10)
      .select(
        'booking_id',
        'customer_name',
        'service_type',
        'appointment_date',
        'status',
        'source',
        'created_at'
      );
    
    // System alerts
    const alerts = [];
    
    // Check for high error rate
    const recentErrors = await db('notification_logs')
      .where('created_at', '>=', new Date(Date.now() - 3600000)) // Last hour
      .where('status', 'failed')
      .count('* as count')
      .first();
    
    if (parseInt(recentErrors.count) > 10) {
      alerts.push({
        type: 'error',
        message: `High notification failure rate: ${recentErrors.count} failures in the last hour`,
        timestamp: new Date()
      });
    }
    
    // Check queue health
    const queueHealth = await getQueueHealth();
    for (const [name, stats] of Object.entries(queueHealth)) {
      if (stats.waiting > 100) {
        alerts.push({
          type: 'warning',
          message: `${name} queue backlog: ${stats.waiting} jobs waiting`,
          timestamp: new Date()
        });
      }
    }
    
    res.json({
      recentCalls,
      recentBookings,
      alerts,
      queueHealth,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Performance metrics endpoint
router.get('/performance', async (req, res) => {
  const db = getDb();
  const { days = 7 } = req.query;
  
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Daily metrics
    const dailyMetrics = await db('calls')
      .where('started_at', '>=', since)
      .select(
        db.raw('DATE(started_at) as date'),
        db.raw('COUNT(*) as calls'),
        db.raw('COUNT(CASE WHEN appointment_booked = true THEN 1 END) as bookings'),
        db.raw('AVG(duration_seconds) as avg_duration')
      )
      .groupBy(db.raw('DATE(started_at)'))
      .orderBy('date');
    
    // AI employee performance
    const aiPerformance = await db('calls')
      .where('started_at', '>=', since)
      .select(
        'ai_employee',
        db.raw('COUNT(*) as total_calls'),
        db.raw('COUNT(CASE WHEN appointment_booked = true THEN 1 END) as bookings'),
        db.raw('AVG(duration_seconds) as avg_duration'),
        db.raw('COUNT(CASE WHEN contains_complaint = true THEN 1 END) as complaints')
      )
      .groupBy('ai_employee');
    
    // Service type performance
    const servicePerformance = await db('bookings')
      .where('created_at', '>=', since)
      .select(
        'service_type',
        db.raw('COUNT(*) as total'),
        db.raw('COUNT(CASE WHEN status = \'completed\' THEN 1 END) as completed'),
        db.raw('COUNT(CASE WHEN status = \'cancelled\' THEN 1 END) as cancelled'),
        db.raw('AVG(price) as avg_price')
      )
      .groupBy('service_type');
    
    res.json({
      timeframe: `${days} days`,
      daily: dailyMetrics,
      aiEmployees: aiPerformance,
      services: servicePerformance
    });
    
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// Helper function to get time boundary
function getTimeBoundary(timeframe) {
  const now = Date.now();
  switch (timeframe) {
    case '1h': return new Date(now - 3600000);
    case '24h': return new Date(now - 86400000);
    case '7d': return new Date(now - 604800000);
    case '30d': return new Date(now - 2592000000);
    default: return new Date(now - 3600000);
  }
}

module.exports = router; 