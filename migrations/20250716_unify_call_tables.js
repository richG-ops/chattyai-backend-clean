// Elite Database Migration - Unified Call Storage
// Handles multi-tenant, high-volume call data with proper indexing

exports.up = async function(knex) {
  // Create calls table with all necessary fields
  await knex.schema.createTable('calls', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable();
    table.string('call_id').notNullable();
    table.string('customer_phone', 20);
    table.string('customer_email', 255);
    table.string('customer_name', 255);
    table.timestamp('call_start_time').defaultTo(knex.fn.now());
    table.timestamp('call_end_time');
    table.integer('call_duration'); // seconds
    table.text('transcript');
    table.jsonb('metadata'); // flexible field for any extra data
    
    // Booking specific fields
    table.timestamp('booking_time');
    table.string('service', 255);
    table.string('booking_status', 50); // pending, confirmed, cancelled
    table.uuid('calendar_event_id');
    
    // Analytics fields
    table.float('sentiment_score');
    table.string('call_outcome', 50); // booked, no_show, cancelled, other
    table.boolean('notification_sent').defaultTo(false);
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes for performance
    table.index(['tenant_id', 'created_at']); // Most common query pattern
    table.index(['tenant_id', 'customer_phone']); // Customer lookup
    table.index(['tenant_id', 'booking_status']); // Status filtering
    table.index('call_id'); // Unique call lookup
    table.index('created_at'); // Time-based queries
  });

  // Create appointments table (for confirmed bookings)
  await knex.schema.createTable('appointments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable();
    table.uuid('call_id').references('id').inTable('calls').onDelete('CASCADE');
    table.string('calendar_event_id').notNullable();
    table.timestamp('start_time').notNullable();
    table.timestamp('end_time').notNullable();
    table.string('service', 255);
    table.string('customer_name', 255);
    table.string('customer_phone', 20);
    table.string('customer_email', 255);
    table.string('status', 50).defaultTo('confirmed'); // confirmed, cancelled, completed
    table.text('notes');
    table.jsonb('reminder_schedule'); // when to send reminders
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['tenant_id', 'start_time']);
    table.index(['tenant_id', 'status']);
    table.index('calendar_event_id');
  });

  // Create notification_logs table
  await knex.schema.createTable('notification_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable();
    table.uuid('call_id').references('id').inTable('calls').onDelete('CASCADE');
    table.string('type', 20).notNullable(); // sms, email, webhook
    table.string('recipient', 255).notNullable();
    table.string('status', 50).notNullable(); // sent, failed, pending
    table.text('message');
    table.string('provider', 50); // twilio, sendgrid, etc
    table.jsonb('provider_response');
    table.jsonb('metadata');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('sent_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['tenant_id', 'created_at']);
    table.index(['call_id']);
    table.index(['status']);
  });

  // Create processed_webhooks table (for idempotency)
  await knex.schema.createTable('processed_webhooks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('webhook_id').notNullable();
    table.string('source', 50).notNullable(); // vapi, zapier, etc
    table.jsonb('payload');
    table.timestamp('processed_at').defaultTo(knex.fn.now());
    
    table.unique(['webhook_id', 'source']);
    table.index('processed_at'); // for cleanup
  });

  // Create tenant_settings table
  await knex.schema.createTable('tenant_settings', (table) => {
    table.uuid('tenant_id').primary();
    table.jsonb('business_hours'); // operating hours
    table.jsonb('services'); // available services
    table.jsonb('notification_preferences');
    table.jsonb('calendar_settings');
    table.string('timezone', 50).defaultTo('America/Los_Angeles');
    table.boolean('active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Add RLS policies if PostgreSQL
  if (knex.client.config.client === 'pg') {
    await knex.raw(`
      -- Enable RLS on all tables
      ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
      ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
      
      -- Create policies for multi-tenant isolation
      CREATE POLICY tenant_isolation_calls ON calls
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
      
      CREATE POLICY tenant_isolation_appointments ON appointments
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
        
      CREATE POLICY tenant_isolation_logs ON notification_logs
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
        
      CREATE POLICY tenant_isolation_settings ON tenant_settings
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
    `);
  }
  
  // Create function for updated_at trigger
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);
  
  // Add triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
    CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
    CREATE TRIGGER update_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
};

exports.down = async function(knex) {
  // Drop triggers first
  await knex.raw('DROP TRIGGER IF EXISTS update_calls_updated_at ON calls');
  await knex.raw('DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments');
  await knex.raw('DROP TRIGGER IF EXISTS update_tenant_settings_updated_at ON tenant_settings');
  
  // Drop function
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column');
  
  // Drop RLS policies if they exist
  if (knex.client.config.client === 'pg') {
    await knex.raw(`
      DROP POLICY IF EXISTS tenant_isolation_calls ON calls;
      DROP POLICY IF EXISTS tenant_isolation_appointments ON appointments;
      DROP POLICY IF EXISTS tenant_isolation_logs ON notification_logs;
      DROP POLICY IF EXISTS tenant_isolation_settings ON tenant_settings;
    `).catch(() => {}); // Ignore errors if policies don't exist
  }
  
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('tenant_settings');
  await knex.schema.dropTableIfExists('processed_webhooks');
  await knex.schema.dropTableIfExists('notification_logs');
  await knex.schema.dropTableIfExists('appointments');
  await knex.schema.dropTableIfExists('calls');
}; 