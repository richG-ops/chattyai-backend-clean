exports.up = function(knex) {
  return knex.raw(`
    -- Enable RLS on critical tables
    ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
    ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
    ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
    
    -- Create tenant isolation policies
    CREATE POLICY tenant_isolation_customers ON customers
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
      
    CREATE POLICY tenant_isolation_bookings ON bookings
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
      
    CREATE POLICY tenant_isolation_calls ON calls
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
      
    CREATE POLICY tenant_isolation_leads ON leads
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  `);
};

exports.down = function(knex) {
  return knex.raw(`
    -- Drop policies
    DROP POLICY IF EXISTS tenant_isolation_customers ON customers;
    DROP POLICY IF EXISTS tenant_isolation_bookings ON bookings;
    DROP POLICY IF EXISTS tenant_isolation_calls ON calls;
    DROP POLICY IF EXISTS tenant_isolation_leads ON leads;
    
    -- Disable RLS
    ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
    ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
    ALTER TABLE calls DISABLE ROW LEVEL SECURITY;
    ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
  `);
}; 