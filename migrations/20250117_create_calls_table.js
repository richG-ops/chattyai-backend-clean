exports.up = function(knex) {
  return knex.schema.createTable('calls', (table) => {
    table.increments('id').primary();
    table.string('call_id').unique().notNullable(); // From Vapi
    table.string('tenant_id').references('api_key').inTable('tenants');
    
    // Call details
    table.string('phone_number').notNullable().index();
    table.string('caller_id'); // If available
    table.timestamp('started_at').notNullable().index();
    table.timestamp('ended_at');
    table.integer('duration_seconds');
    table.string('direction').defaultTo('inbound'); // inbound, outbound
    
    // AI Assistant details
    table.string('assistant_id'); // Vapi assistant ID
    table.string('ai_employee'); // luna, rachel, etc.
    
    // Call outcome
    table.string('outcome'); // booked, info_provided, hung_up, voicemail, transferred
    table.boolean('appointment_booked').defaultTo(false);
    table.string('booking_id'); // Reference to bookings table
    
    // Customer identification
    table.integer('customer_id').unsigned().references('id').inTable('customers');
    table.boolean('new_customer').defaultTo(true);
    
    // Conversation data
    table.text('transcript'); // Full conversation transcript
    table.jsonb('messages'); // Structured messages array
    table.jsonb('extracted_data'); // Name, email, phone, service type, etc.
    table.jsonb('intent_classification'); // What the caller wanted
    
    // Quality metrics
    table.decimal('sentiment_score', 3, 2); // -1 to 1
    table.integer('customer_satisfaction'); // 1-5 rating if collected
    table.boolean('escalation_needed').defaultTo(false);
    table.text('escalation_reason');
    
    // Technical details
    table.string('recording_url');
    table.decimal('cost', 10, 4); // Call cost in dollars
    table.string('provider').defaultTo('vapi'); // vapi, twilio, etc.
    table.jsonb('provider_metadata'); // Raw data from provider
    
    // Analysis flags
    table.boolean('contains_complaint').defaultTo(false);
    table.boolean('contains_question').defaultTo(false);
    table.boolean('requires_followup').defaultTo(false);
    table.text('followup_notes');
    
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['tenant_id', 'started_at']);
    table.index(['customer_id', 'started_at']);
    table.index(['outcome', 'started_at']);
    table.index('booking_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('calls');
}; 