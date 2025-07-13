exports.up = function(knex) {
  return knex.schema.createTable('customers', (table) => {
    table.increments('id').primary();
    table.string('customer_id').unique().notNullable(); // UUID for external reference
    table.string('phone').notNullable().index();
    table.string('email').index();
    table.string('name').notNullable();
    table.string('preferred_name'); // For personalization
    table.jsonb('metadata'); // Store additional data from calls
    table.string('source'); // vapi, website, manual, etc.
    table.string('status').defaultTo('active'); // active, inactive, blocked
    table.integer('total_bookings').defaultTo(0);
    table.integer('no_shows').defaultTo(0);
    table.decimal('lifetime_value', 10, 2).defaultTo(0);
    table.text('notes'); // Internal notes
    table.jsonb('preferences'); // Service preferences, time preferences, etc.
    table.timestamp('last_contact_at');
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['phone', 'email']);
    table.index('created_at');
    table.index('last_contact_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('customers');
}; 