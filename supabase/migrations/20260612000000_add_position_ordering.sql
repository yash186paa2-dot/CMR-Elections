-- Create positions table for ordering
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read positions"
  ON positions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage positions"
  ON positions FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

-- Insert existing positions from candidates table
INSERT INTO positions (name, display_order)
SELECT DISTINCT position, 0
FROM candidates
ON CONFLICT (name) DO NOTHING;

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_positions_updated_at
    BEFORE UPDATE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically add new positions from candidates table
CREATE OR REPLACE FUNCTION sync_positions_from_candidates()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO positions (name, display_order)
    VALUES (NEW.position, 0)
    ON CONFLICT (name) DO NOTHING;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_candidate_insert_update_position
    AFTER INSERT OR UPDATE OF position ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION sync_positions_from_candidates();
