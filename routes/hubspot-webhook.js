// ==========================================================================
// HUBSPOT WEBHOOK ENDPOINT   /api/v1/hubspot/webhook
// --------------------------------------------------------------------------
// • GET  → HubSpot sends ?hub.challenge=123 for initial verification.
//          We must return the same value as plain text (200) so HubSpot
//          marks the endpoint “verified”.
//
// • POST → Array of event objects will arrive whenever a subscribed
//          event fires.  For now we log the events and, if we get contact
//          data, forward it to the HubSpotService (lib/hubspot-service.js)
//          which creates/updates the contact in HubSpot CRM.
//
//  Env var required: HUBSPOT_API_KEY (already referenced by HubSpotService)
// ==========================================================================
const express = require('express');
const router  = express.Router();
const HubSpotService = require('../lib/hubspot-service');

// --------------------------------------------------------------------------
// GET  /api/v1/hubspot/webhook   (verification)
// --------------------------------------------------------------------------
router.get('/', (req, res) => {
  const challenge = req.query['hub.challenge'];
  if (challenge) {
    console.log(`✅ HubSpot verification challenge received (${challenge})`);
    return res.status(200).send(challenge);
  }
  return res.status(400).send('Missing hub.challenge');
});

// --------------------------------------------------------------------------
// POST /api/v1/hubspot/webhook   (events)
// --------------------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    console.log(`🔔 HubSpot webhook received (${events.length} events)`);

    for (const evt of events) {
      // Example: contact.creation or propertyChange
      if (evt.object === 'contact') {
        const props = evt.properties || {};
        await HubSpotService.upsertLead({
          email: props.email,
          phone: props.phone,
          firstname: props.firstname,
          lastname: props.lastname,
          company: props.company
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ HubSpot webhook error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router; 