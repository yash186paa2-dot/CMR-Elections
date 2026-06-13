-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure election_status exists in election_settings with a valid default
INSERT INTO election_settings (key, value)
VALUES ('election_status', '"closed"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value WHERE election_settings.value IS NULL;

-- Add results_visibility setting
INSERT INTO election_settings (key, value)
VALUES ('results_visibility', '"hidden"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Grant permissions for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));
