-- Create houses table
CREATE TABLE IF NOT EXISTS houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_order INTEGER DEFAULT 0,
  color TEXT DEFAULT 'slate',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read houses"
  ON houses FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage houses"
  ON houses FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

-- Insert initial houses based on current hardcoded values
INSERT INTO houses (name, display_order, color) VALUES
  ('Agni House', 0, 'orange'),
  ('Jal House', 1, 'blue'),
  ('Bhoomi House', 2, 'emerald'),
  ('Vayu House', 3, 'purple')
ON CONFLICT (name) DO NOTHING;
