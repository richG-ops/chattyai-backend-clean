const { Client } = require('pg');

const sql = `
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  call_sid TEXT UNIQUE NOT NULL,
  from_number TEXT,
  to_number TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID PRIMARY KEY,
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  recording_sid TEXT UNIQUE NOT NULL,
  media_url TEXT,
  duration_seconds INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS call_summaries (
  id UUID PRIMARY KEY,
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  transcript TEXT,
  summary TEXT,
  sentiment TEXT,
  classification JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS followups (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  when_at TIMESTAMPTZ NOT NULL,
  title TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  created_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings and notifications audit for reporting
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_id TEXT UNIQUE,
  start_iso TEXT,
  end_iso TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications_audit (
  id SERIAL PRIMARY KEY,
  kind TEXT CHECK (kind IN ('confirm','reminder24','reminder2')),
  to_phone TEXT,
  send_at TIMESTAMPTZ,
  queued_at TIMESTAMPTZ DEFAULT now(),
  booking_id TEXT
);
`;

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }});
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log('✅ ensure-schema: tables present');
})().catch(e => { console.error('ensure-schema failed:', e); process.exit(1); });


