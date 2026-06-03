/*
  # College Election Voting System Schema

  ## Overview
  Creates all tables needed for a secure college election voting system.

  ## New Tables

  ### 1. `admins`
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users)
  - `email` (text, unique)

  ### 2. `candidates`
  - `id` (uuid, primary key)
  - `name`, `position`, `department`, `year`, `bio`, `photo_url`, `manifesto`
  - `vote_count` (integer) - cached count maintained by trigger

  ### 3. `votes`
  - UNIQUE(voter_id, position) prevents double voting per position

  ## Security
  - RLS on all tables
  - Vote count auto-incremented via trigger on insert
*/

-- Admins table (created first so candidate/vote policies can reference it)
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin list"
  ON admins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS admins_user_id_idx ON admins(user_id);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position text NOT NULL,
  department text NOT NULL DEFAULT '',
  year text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  photo_url text NOT NULL DEFAULT '',
  manifesto text NOT NULL DEFAULT '',
  vote_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read candidates"
  ON candidates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can preview candidates"
  ON candidates FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins can insert candidates"
  ON candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update candidates"
  ON candidates FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS candidates_position_name_idx ON candidates(position, name);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voter_email text NOT NULL,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  position text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(voter_id, position)
);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own vote"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = voter_id
    AND EXISTS (
      SELECT 1
      FROM candidates
      WHERE candidates.id = votes.candidate_id
        AND candidates.position = votes.position
    )
  );

CREATE POLICY "Users can read their own votes"
  ON votes FOR SELECT
  TO authenticated
  USING (auth.uid() = voter_id);

CREATE POLICY "Admins can read all votes"
  ON votes FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS votes_voter_id_idx ON votes(voter_id);
CREATE INDEX IF NOT EXISTS votes_candidate_id_idx ON votes(candidate_id);
CREATE INDEX IF NOT EXISTS votes_position_created_at_idx ON votes(position, created_at DESC);

-- Trigger to increment vote_count on candidates when a vote is cast
CREATE OR REPLACE FUNCTION increment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE candidates
  SET vote_count = vote_count + 1
  WHERE id = NEW.candidate_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_vote_insert ON votes;
CREATE TRIGGER on_vote_insert
  AFTER INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION increment_vote_count();

-- Seed sample candidates
INSERT INTO candidates (name, position, department, year, bio, photo_url, manifesto) VALUES
  ('Arjun Sharma', 'President', 'Computer Science', '3rd Year', 'Tech enthusiast passionate about student welfare and innovation.', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400', 'Better labs, faster Wi-Fi, more internship tie-ups'),
  ('Priya Mehta', 'President', 'Electronics', '3rd Year', 'Dedicated leader committed to transparent governance and inclusive campus life.', 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400', 'Mental health support, women safety cell, green campus'),
  ('Rohan Verma', 'Vice President', 'Mechanical', '2nd Year', 'Sports captain and cultural fest organizer with a vision for a vibrant campus.', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400', 'More sports facilities, annual fest expansion, alumni network'),
  ('Sneha Patel', 'Vice President', 'Civil', '2nd Year', 'Academic topper and community volunteer focused on student academic excellence.', 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400', 'Free certification courses, study groups, library expansion'),
  ('Karthik Nair', 'Secretary', 'IT', '2nd Year', 'Passionate about digital transformation and making college processes easier.', 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400', 'Online grievance portal, digital ID cards, smart attendance'),
  ('Divya Krishnan', 'Treasurer', 'ECE', '3rd Year', 'Finance management enthusiast with plans to maximize student fund utilization.', 'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=400', 'Transparent budgets, student startup fund, more scholarships')
ON CONFLICT DO NOTHING;
