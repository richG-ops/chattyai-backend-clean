exports.up = function(knex) {
  return knex.schema
    .createTable('canary_calls', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable();
      table.string('call_id').notNullable();
      table.string('status').notNullable();
      table.json('metadata');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['tenant_id', 'created_at']);
      table.index('call_id');
    })
    .createTable('canary_failures', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable();
      table.text('error_message').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['tenant_id', 'created_at']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('canary_failures')
    .dropTableIfExists('canary_calls');
}; 