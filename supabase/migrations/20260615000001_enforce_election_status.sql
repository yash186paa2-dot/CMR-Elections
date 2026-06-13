-- Function to check if election is open
CREATE OR REPLACE FUNCTION check_election_open()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT value#>>'{}' FROM election_settings WHERE key = 'election_status') != 'open' THEN
    RAISE EXCEPTION 'Voting is currently closed.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on votes table
DROP TRIGGER IF EXISTS tr_check_election_open ON votes;
CREATE TRIGGER tr_check_election_open
  BEFORE INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION check_election_open();
