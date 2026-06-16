-- Function to reset election votes safely
-- This function is designed to be called by an admin to clear all election results
-- while preserving candidate and student infrastructure.

CREATE OR REPLACE FUNCTION reset_election_data()
RETURNS void AS $$
BEGIN
  -- 1. Clear all votes
  DELETE FROM votes;
  
  -- 2. Reset vote counters for all candidates
  UPDATE candidates SET vote_count = 0;
  
  -- 3. Reset voting status for all students
  UPDATE students SET has_voted = false;
  
  -- 4. Reset sequences if they exist (optional, for clean IDs in future)
  -- ALTER SEQUENCE IF EXISTS votes_id_seq RESTART WITH 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
