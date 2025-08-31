const express = require('express');
const router = express.Router();
const calendarClient = require('../lib/calendarClient');

// Middleware to check debug API key
function requireDebugKey(req, res, next) {
  const debugKey = process.env.DEBUG_API_KEY;
  if (!debugKey) {
    return res.status(403).json({ 
      error: 'Debug mode not enabled',
      message: 'DEBUG_API_KEY environment variable not set'
    });
  }
  
  const providedKey = req.headers['x-debug-key'];
  if (!providedKey || providedKey !== debugKey) {
    return res.status(403).json({ 
      error: 'Invalid debug key',
      message: 'X-Debug-Key header required and must match DEBUG_API_KEY'
    });
  }
  
  next();
}

// Apply debug key requirement to all routes
router.use(requireDebugKey);

// GET /debug/calendar - Calendar diagnostics
router.get('/calendar', async (req, res) => {
  try {
    console.log('🔍 Debug calendar diagnostics requested');
    
    const provider = calendarClient.providerName;
    const isCalcom = provider === 'calcom';
    const baseUrl = isCalcom ? null : (process.env.CALENDAR_API_URL || null);
    const hasJwt = isCalcom ? false : !!(process.env.TENANT_JWT || process.env.CALENDAR_JWT);
    const hasKey = isCalcom ? !!process.env.CAL_API_KEY : !!(process.env.TENANT_JWT || process.env.CALENDAR_JWT);
    
    // Test calendar health
    let healthResult;
    try {
      const probe = await calendarClient.availability({ limit: 1 });
      const slotsFound = Array.isArray(probe) ? probe.length : (probe?.slots?.length || 0);
      healthResult = { ok: true, status: 200, data: { slotsFound } };
    } catch (e) {
      healthResult = { ok: false, status: e?.code || e?.response?.status || 'error', error: e?.message };
    }
    
    // Test availability (with minimal params)
    let availabilityResult = { ok: false, status: 'not_tested' };
    try {
      const avail = await calendarClient.availability({ limit: 1 });
      availabilityResult = { 
        ok: true, 
        status: 'success',
        slotsFound: Array.isArray(avail) ? avail.length : (avail.slots?.length || 0)
      };
    } catch (err) {
      availabilityResult = { 
        ok: false, 
        status: err.code || 'error',
        error: err.message
      };
    }
    
    const diagnostics = {
      provider: isCalcom ? 'calcom' : 'legacy',
      baseUrl: baseUrl || 'not_set',
      hasJwt,
      hasKey,
      health: healthResult,
      availability: availabilityResult,
      timestamp: new Date().toISOString(),
      requestId: `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    console.log('🔍 Calendar diagnostics:', {
      baseUrl: baseUrl ? `${String(baseUrl).split('/')[0]}//${String(baseUrl).split('/')[2]}/...` : 'none',
      provider: diagnostics.provider,
      hasJwt,
      hasKey,
      healthOk: healthResult.ok,
      availabilityOk: availabilityResult.ok
    });
    
    res.json(diagnostics);
    
  } catch (error) {
    console.error('❌ Debug calendar error:', error);
    res.status(500).json({
      error: 'Debug diagnostics failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /debug/config - Show masked configuration
router.get('/config', (req, res) => {
  try {
    const config = {
      environment: process.env.NODE_ENV || 'development',
      calendar: {
        hasUrl: !!process.env.CALENDAR_API_URL,
        hasJwt: !!(process.env.TENANT_JWT || process.env.CALENDAR_JWT),
        hasTz: !!process.env.TENANT_TZ
      },
      redis: {
        hasUrl: !!process.env.REDIS_URL
      },
      twilio: {
        hasSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasToken: !!process.env.TWILIO_AUTH_TOKEN
      },
      openai: {
        hasKey: !!process.env.OPENAI_API_KEY
      },
      sendgrid: {
        hasKey: !!process.env.SENDGRID_API_KEY
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(config);
    
  } catch (error) {
    console.error('❌ Debug config error:', error);
    res.status(500).json({
      error: 'Config diagnostics failed',
      message: error.message
    });
  }
});

module.exports = router;
