exports.up = function(knex) {
  return knex.raw(`
    CREATE OR REPLACE VIEW v_dashboard_calls AS
    SELECT
      c.created_at,
      c.tenant_id,
      c.call_id,
      c.phone_number as customer_number,
      c.ai_employee,
      c.duration_seconds,
      c.outcome,
      q.question,
      q.answer,
      q.intent,
      q.metadata,
      b.booking_id,
      b.appointment_date,
      b.status as booking_status,
      cust.name as customer_name,
      cust.email as customer_email
    FROM calls c
    LEFT JOIN LATERAL (
      SELECT question, answer, intent, metadata
      FROM call_qa_pairs
      WHERE call_id = c.call_id
      ORDER BY sequence_number DESC 
      LIMIT 1
    ) q ON TRUE
    LEFT JOIN bookings b ON b.call_id = c.call_id
    LEFT JOIN customers cust ON cust.phone = c.phone_number
    WHERE c.tenant_id = current_setting('app.tenant_id', true)::uuid
    ORDER BY c.created_at DESC;
    
    -- Grant read access to app user
    GRANT SELECT ON v_dashboard_calls TO CURRENT_USER;
  `);
};

exports.down = function(knex) {
  return knex.raw('DROP VIEW IF EXISTS v_dashboard_calls;');
}; 