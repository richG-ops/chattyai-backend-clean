// migrations/20250716_unify_call_tables.js
exports.up = async function(knex) {
  // Ensure calls table exists with all required fields
  await knex.schema.createTableIfNotExists('calls', (table) => {
    table.uuid('call_id').primary();
    table.uuid('tenant_id').notNullable().defaultTo(knex.raw("'00000000-0000-0000-0000-000000000000'::uuid"));
    table.string('phone_number', 20);
    table.timestamp('started_at');
    table.timestamp('ended_at');
    table.integer('duration_seconds');
    table.string('outcome', 50);
    table.jsonb('extracted_data');
    table.text('transcript');
    table.string('caller_phone');
    table.string('caller_email'); 
    table.timestamp('appointment_date');
    table.string('status').defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Migrate data from call_data if it exists
  if (await knex.schema.hasTable('call_data')) {
    console.log('Migrating data from call_data to calls...');
    
    const existingData = await knex('call_data').select('*');
    
    for (const row of existingData) {
      await knex('calls').insert({
        call_id: row.id || knex.raw('gen_random_uuid()'),
        tenant_id: process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000000',
        phone_number: row.caller_phone,
        extracted_data: knex.raw("'{}'::jsonb"),
        caller_phone: row.caller_phone,
        caller_email: row.caller_email,
        appointment_date: row.appointment_date,
        status: row.status || 'pending',
        created_at: row.created_at || knex.fn.now(),
        updated_at: row.updated_at || knex.fn.now()
      }).onConflict('call_id').ignore();
    }
    
    console.log(`Migrated ${existingData.length} records`);
    await knex.schema.dropTable('call_data');
  }

  // Add indexes for performance with 1000+ clients
  await knex.schema.table('calls', (table) => {
    table.index(['tenant_id', 'appointment_date']);
    table.index('status');
    table.index('created_at');
  });

  // Auto-update timestamp trigger
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$
    BEGIN 
      NEW.updated_at = NOW(); 
      RETURN NEW; 
    END;
    $$ LANGUAGE plpgsql;
    
    DROP TRIGGER IF EXISTS update_calls_updated_at ON calls;
    CREATE TRIGGER update_calls_updated_at 
      BEFORE UPDATE ON calls 
      FOR EACH ROW 
      EXECUTE PROCEDURE update_timestamp();
  `);
  
  console.log('✅ Unified calls table created with indexes and triggers');
};

exports.down = async function(knex) {
  // Rollback - recreate call_data table if needed
  await knex.schema.dropTableIfExists('calls');
  console.log('Rolled back unified calls table');
}; 