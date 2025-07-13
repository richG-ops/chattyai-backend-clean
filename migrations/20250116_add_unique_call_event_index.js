exports.up = function(knex) {
  return knex.schema.alterTable('calls', (table) => {
    table.unique(['vapi_call_id', 'event_type'], 'idx_call_event_unique');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('calls', (table) => {
    table.dropUnique(['vapi_call_id', 'event_type'], 'idx_call_event_unique');
  });
}; 