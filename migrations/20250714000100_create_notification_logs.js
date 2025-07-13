exports.up = function(knex) {
  return knex.schema.createTable('notification_logs', function(table) {
    table.increments('id').primary();
    table.string('type').notNullable(); // sms, email, etc.
    table.string('recipient').notNullable();
    table.string('status').notNullable(); // sent, delivered, failed
    table.text('message');
    table.text('error');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('notification_logs');
}; 