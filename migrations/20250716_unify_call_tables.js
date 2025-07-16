exports.up = async function(knex) {
  console.log('🔄 Starting call table unification...');
  
  // First ensure businesses table exists
  const businessesExists = await knex.schema.hasTable('businesses');
  if (!businessesExists) {
    await knex.schema.createTable('businesses', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('owner_phone');
      table.string('owner_email');
      table.timestamps(true, true);
    });
    
    // Insert default business
    await knex('businesses').insert({
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Default Business',
      owner_phone: process.env.OWNER_PHONE || '+17027760084',
      owner_email: process.env.OWNER_EMAIL || 'richard.gallagherxyz@gmail.com'
    });
  }
  
  // Check if calls table exists, create if not
  const callsExists = await knex.schema.hasTable('calls');
  if (!callsExists) {
    await knex.schema.createTable('calls', (table) => {
      table.increments('id').primary();
      table.string('call_id').unique().notNullable();
      table.string('tenant_id').defaultTo(process.env.DEFAULT_TENANT_ID);
      table.string('phone_number').notNullable();
      table.timestamp('started_at').defaultTo(knex.fn.now());
      table.timestamp('ended_at');
      table.integer('duration_seconds');
      table.string('ai_employee').defaultTo('luna');
      table.string('outcome');
      table.text('transcript');
      table.jsonb('messages');
      table.jsonb('extracted_data');
      table.string('recording_url');
      table.decimal('cost', 10, 4).defaultTo(0);
      table.timestamps(true, true);
    });
  }
  
  // Add missing fields to calls table for unified schema
  await knex.schema.table('calls', (table) => {
    // Check if columns exist before adding
    if (!table.hasColumn) {
      // Fallback: Try to add and catch if exists
      try {
        table.string('caller_phone');
        table.string('caller_email'); 
        table.timestamp('appointment_date');
        table.uuid('business_id').defaultTo('00000000-0000-0000-0000-000000000000');
        table.string('status').defaultTo('pending');
        table.string('customer_name');
        table.string('service_type');
      } catch (e) {
        console.log('Some columns may already exist, continuing...');
      }
    }
  });
  
  // Add foreign key constraint
  try {
    await knex.schema.table('calls', (table) => {
      table.foreign('business_id').references('id').inTable('businesses').onDelete('CASCADE');
    });
  } catch (e) {
    console.log('Foreign key may already exist');
  }
  
  // Migrate data from call_data to calls if it exists
  const callDataExists = await knex.schema.hasTable('call_data');
  if (callDataExists) {
    console.log('📦 Migrating data from call_data to calls...');
    
    const callDataRecords = await knex('call_data').select('*');
    
    for (const record of callDataRecords) {
      // Check if already migrated
      const existing = await knex('calls').where('call_id', record.call_id || record.id).first();
      
      if (!existing) {
        await knex('calls').insert({
          call_id: record.call_id || record.id,
          phone_number: record.caller_phone,
          caller_phone: record.caller_phone,
          caller_email: record.caller_email,
          customer_name: record.customer_name,
          appointment_date: record.appointment_date,
          business_id: record.business_id || '00000000-0000-0000-0000-000000000000',
          status: record.status || 'pending',
          service_type: record.service_type,
          extracted_data: record.raw_vapi_payload ? JSON.stringify(record.raw_vapi_payload) : null,
          created_at: record.created_at,
          updated_at: record.updated_at
        });
      }
    }
    
    console.log(`✅ Migrated ${callDataRecords.length} records from call_data to calls`);
  }
  
  // Add performance indexes
  await knex.schema.table('calls', (table) => {
    table.index('business_id', 'idx_calls_business_id');
    table.index('appointment_date', 'idx_calls_appointment_date');
    table.index('status', 'idx_calls_status');
    table.index('caller_phone', 'idx_calls_phone');
    table.index(['business_id', 'appointment_date'], 'idx_calls_business_date');
  });
  
  // Enable Row Level Security
  await knex.raw(`
    ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
    
    -- Drop policy if exists
    DROP POLICY IF EXISTS calls_tenant_isolation ON calls;
    
    -- Create tenant isolation policy
    CREATE POLICY calls_tenant_isolation ON calls
      FOR ALL
      USING (
        business_id = COALESCE(
          current_setting('app.current_business_id', true)::uuid, 
          '00000000-0000-0000-0000-000000000000'::uuid
        )
      );
  `);
  
  // Create or replace updated_at trigger
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Drop trigger if exists
    DROP TRIGGER IF EXISTS update_calls_timestamp ON calls;
    
    -- Create trigger
    CREATE TRIGGER update_calls_timestamp
    BEFORE UPDATE ON calls
    FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
  `);
  
  // Clean up old call_data table if migration successful
  if (callDataExists) {
    console.log('🗑️ Dropping old call_data table...');
    await knex.schema.dropTable('call_data');
  }
  
  console.log('✅ Call table unification complete!');
};

exports.down = async function(knex) {
  // Rollback: Disable RLS, drop indexes, remove added columns
  await knex.raw(`
    ALTER TABLE calls DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS calls_tenant_isolation ON calls;
    DROP TRIGGER IF EXISTS update_calls_timestamp ON calls;
  `);
  
  // Note: We don't recreate call_data table to avoid data loss
  console.log('⚠️ Rollback complete - manual intervention may be needed');
}; 