-- EMERGENCY ELECTION MODE BYPASS
-- This migration redefines the check_election_open function to always allow voting.
-- To restore normal behavior, run the previous migration or redefine this function.

CREATE OR REPLACE FUNCTION check_election_open()
RETURNS TRIGGER AS $$
BEGIN
  -- EMERGENCY MODE: Always allow voting regardless of status in election_settings
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
