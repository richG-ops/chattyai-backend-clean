exports.up = function(knex) {
  return knex.schema.createTable('leads', (table) => {
    table.increments('id').primary();
    table.string('lead_id').unique().notNullable(); // UUID
    table.string('tenant_id').references('api_key').inTable('tenants');
    
    // Lead information
    table.string('name');
    table.string('phone').index();
    table.string('email').index();
    table.string('company');
    table.string('industry');
    
    // Lead source
    table.string('source').notNullable(); // vapi_call, website, referral, etc.
    table.string('source_details'); // Specific campaign, referrer, etc.
    table.string('call_id').references('call_id').inTable('calls');
    
    // Lead qualification
    table.string('status').defaultTo('new'); // new, contacted, qualified, unqualified, converted, lost
    table.integer('score').defaultTo(0); // 0-100 lead score
    table.jsonb('qualification_data'); // Answers to qualification questions
    table.string('budget_range');
    table.string('timeline'); // immediate, 1_month, 3_months, 6_months, future
    table.text('needs'); // What they're looking for
    
    // Interest level
    table.string('interest_level'); // hot, warm, cold
    table.jsonb('interested_services'); // Array of services they're interested in
    
    // Follow-up
    table.timestamp('next_followup_date');
    table.string('assigned_to'); // Sales rep or AI assistant
    table.integer('followup_count').defaultTo(0);
    table.timestamp('last_contact_date');
    table.text('last_contact_notes');
    
    // Conversion tracking
    table.boolean('converted').defaultTo(false);
    table.timestamp('converted_at');
    table.integer('converted_customer_id').unsigned().references('id').inTable('customers');
    table.decimal('conversion_value', 10, 2);
    
    // Communication preferences
    table.string('preferred_contact_method'); // phone, sms, email
    table.string('preferred_contact_time'); // morning, afternoon, evening
    table.jsonb('do_not_contact'); // Array of methods not to use
    
    // Metadata
    table.jsonb('metadata');
    table.text('notes');
    table.jsonb('tags'); // Array of tags for segmentation
    
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['tenant_id', 'status']);
    table.index(['tenant_id', 'created_at']);
    table.index(['assigned_to', 'next_followup_date']);
    table.index('converted');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('leads');
}; 