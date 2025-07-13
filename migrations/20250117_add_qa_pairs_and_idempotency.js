exports.up = function(knex) {
  return knex.schema
    // Proper idempotency table
    .createTable('processed_webhooks', (table) => {
      table.uuid('request_id').primary();
      table.timestamp('processed_at').defaultTo(knex.fn.now());
      table.json('response'); // Store response for replay
      table.string('event_type');
      
      // Auto-cleanup old records after 7 days
      table.index('processed_at');
    })
    
    // Structured Q&A pairs from voice calls
    .createTable('call_qa_pairs', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('call_id').notNullable();
      table.uuid('tenant_id').notNullable();
      table.text('question');
      table.text('answer');
      table.integer('sequence_number'); // Order in conversation
      table.string('intent'); // booking, complaint, inquiry, etc.
      table.json('metadata'); // Additional extracted data
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.foreign('call_id').references('call_id').inTable('calls');
      table.index(['call_id', 'sequence_number']);
      table.index(['tenant_id', 'created_at']);
      table.index('intent');
    })
    
    // Strengthen calls table constraints
    .alterTable('calls', (table) => {
      // Add unique constraint if not exists
      table.unique('call_id');
    })
    
    // Add composite index for event deduplication
    .raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_call_event_unique 
      ON calls(call_id, COALESCE(event_type, 'default'))
    `);
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('call_qa_pairs')
    .dropTableIfExists('processed_webhooks')
    .raw('DROP INDEX IF EXISTS idx_call_event_unique');
}; 