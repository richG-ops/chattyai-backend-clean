CREATE TABLE IF NOT EXISTS sms_suppressions (
  id SERIAL PRIMARY KEY,
  to_e164 TEXT UNIQUE NOT NULL,
  suppressed BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sms_suppressions_set_updated ON sms_suppressions;
CREATE TRIGGER sms_suppressions_set_updated
BEFORE UPDATE ON sms_suppressions
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

