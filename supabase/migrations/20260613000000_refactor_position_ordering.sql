-- Add display_order to candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Drop positions table and its related objects
DROP TRIGGER IF EXISTS update_positions_updated_at ON positions;
DROP TRIGGER IF EXISTS on_candidate_insert_update_position ON candidates;
DROP FUNCTION IF EXISTS sync_positions_from_candidates();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS positions;
