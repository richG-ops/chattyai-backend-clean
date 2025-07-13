exports.up = function(knex) {
  return knex.schema.createTable('processed_webhooks', (table) => {
    table.uuid('request_id')
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()'));  // Auto-generate UUID
    table.string('function_name', 50).notNullable();
    table.jsonb('parameters');
    table.jsonb('response');
    table.timestampTz('received_at').defaultTo(knex.fn.now());  // Use timezone-aware timestamp
    
    // Single index for cleanup queries
    table.index(['received_at']);
    // Index for filtering by function
    table.index(['function_name']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('processed_webhooks');
}; 