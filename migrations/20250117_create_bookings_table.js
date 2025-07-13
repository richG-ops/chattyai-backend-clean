exports.up = function(knex) {
  return knex.schema.createTable('bookings', (table) => {
    table.increments('id').primary();
    table.string('booking_id').unique().notNullable(); // UUID for external reference
    table.integer('customer_id').unsigned().references('id').inTable('customers').onDelete('CASCADE');
    table.string('tenant_id').references('api_key').inTable('tenants'); // Multi-tenant support
    
    // Appointment details
    table.string('service_type').notNullable();
    table.timestamp('appointment_date').notNullable().index();
    table.integer('duration_minutes').defaultTo(60);
    table.string('status').defaultTo('pending'); // pending, confirmed, completed, cancelled, no_show
    
    // Customer info snapshot (in case customer record changes)
    table.string('customer_name').notNullable();
    table.string('customer_phone').notNullable();
    table.string('customer_email');
    
    // Booking source
    table.string('source').defaultTo('vapi'); // vapi, website, manual, phone
    table.string('ai_employee'); // luna, rachel, etc.
    table.string('call_id'); // Reference to calls table
    
    // Calendar integration
    table.string('calendar_event_id');
    table.string('calendar_provider').defaultTo('google'); // google, outlook, etc.
    
    // Financial
    table.decimal('price', 10, 2);
    table.decimal('paid_amount', 10, 2).defaultTo(0);
    table.string('payment_status').defaultTo('pending'); // pending, paid, refunded
    
    // Notifications sent
    table.boolean('customer_sms_sent').defaultTo(false);
    table.boolean('customer_email_sent').defaultTo(false);
    table.boolean('owner_sms_sent').defaultTo(false);
    table.boolean('owner_email_sent').defaultTo(false);
    table.boolean('reminder_sent').defaultTo(false);
    
    // Metadata
    table.jsonb('metadata'); // Store any additional data
    table.text('notes');
    table.timestamp('confirmed_at');
    table.timestamp('completed_at');
    table.timestamp('cancelled_at');
    table.string('cancellation_reason');
    
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['appointment_date', 'status']);
    table.index(['customer_id', 'appointment_date']);
    table.index(['tenant_id', 'appointment_date']);
    table.index('call_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('bookings');
}; 