exports.up = function(knex) {
  return knex.schema.createTable('failed_jobs', (table) => {
    table.bigIncrements('id').primary();
    table.string('job_id').notNullable();
    table.string('queue_name').notNullable();
    table.string('job_name').notNullable();
    table.json('data');
    table.text('error_message');
    table.integer('attempts').defaultTo(0);
    table.timestamp('failed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['queue_name', 'created_at']);
    table.index('job_name');
    table.index('failed_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('failed_jobs');
}; 