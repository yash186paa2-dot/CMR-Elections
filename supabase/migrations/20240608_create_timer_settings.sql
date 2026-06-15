-- Create election_settings table for timer and election controls
CREATE TABLE IF NOT EXISTS election_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default timer settings
INSERT INTO election_settings (key, value) VALUES
  ('timer_enabled', 'false'::jsonb),
  ('timer_duration', '60'::jsonb),
  ('timer_status', 'stopped'::jsonb),
  ('timer_start_time', NULL::jsonb),
  ('election_status', 'closed'::jsonb),
  ('auto_reset_seconds', '10'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_election_settings_key ON election_settings(key);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON election_settings TO authenticated;
GRANT SELECT ON election_settings TO anon;
