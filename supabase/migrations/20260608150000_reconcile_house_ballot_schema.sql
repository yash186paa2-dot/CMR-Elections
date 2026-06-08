/*
  Reconcile house ballot schema and restore per-position voting.

  Why this exists:
  - Some environments only applied the original election schema and are missing
    `public.users` and `votes.house`.
  - Some environments applied the first house-voting migration but not the
    candidate `None` fix.
  - The first house-voting trigger accidentally changed ballot behavior from
    "one vote per position" to "one total vote", which breaks the original
    election flow.
*/

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS full_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS house text,
  ADD COLUMN IF NOT EXISTS house_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS house text;
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS house text;

UPDATE public.candidates
SET house = 'None'
WHERE house IS NULL OR trim(house) = '';

UPDATE public.votes AS v
SET house = COALESCE(
  NULLIF(trim(u.house), ''),
  CASE
    WHEN c.house IS NOT NULL AND c.house <> 'None' THEN c.house
    ELSE NULL
  END,
  'Agni House'
)
FROM public.candidates AS c
LEFT JOIN public.users AS u
  ON u.id = v.voter_id
WHERE c.id = v.candidate_id
  AND (v.house IS NULL OR trim(v.house) = '');

ALTER TABLE public.candidates
  ALTER COLUMN house SET DEFAULT 'None';

ALTER TABLE public.candidates
  ALTER COLUMN house SET NOT NULL;

ALTER TABLE public.votes
  ALTER COLUMN house SET DEFAULT 'Agni House';

ALTER TABLE public.votes
  ALTER COLUMN house SET NOT NULL;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_house_check;
ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS candidates_house_check;
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_house_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_house_check
  CHECK (house IS NULL OR house IN ('Agni House', 'Jal House', 'Bhoomi House', 'Vayu House'));

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_house_check
  CHECK (house IN ('None', 'Agni House', 'Jal House', 'Bhoomi House', 'Vayu House'));

ALTER TABLE public.votes
  ADD CONSTRAINT votes_house_check
  CHECK (house IN ('Agni House', 'Jal House', 'Bhoomi House', 'Vayu House'));

CREATE INDEX IF NOT EXISTS users_house_idx ON public.users(house);
CREATE INDEX IF NOT EXISTS candidates_house_position_name_idx
  ON public.candidates(house, position, name);
CREATE INDEX IF NOT EXISTS votes_house_created_at_idx
  ON public.votes(house, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'votes_voter_id_position_key'
      AND conrelid = 'public.votes'::regclass
  ) THEN
    ALTER TABLE public.votes
      ADD CONSTRAINT votes_voter_id_position_key UNIQUE (voter_id, position);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Users can read their own voter profile'
  ) THEN
    CREATE POLICY "Users can read their own voter profile"
      ON public.users FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Users can create their own voter profile'
  ) THEN
    CREATE POLICY "Users can create their own voter profile"
      ON public.users FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Users can update their own voter profile'
  ) THEN
    CREATE POLICY "Users can update their own voter profile"
      ON public.users FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Admins can read all voter profiles'
  ) THEN
    CREATE POLICY "Admins can read all voter profiles"
      ON public.users FOR SELECT
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.guard_voter_house_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.email := lower(trim(COALESCE(NEW.email, OLD.email, '')));
  NEW.full_name := trim(COALESCE(NEW.full_name, OLD.full_name, ''));
  NEW.updated_at := now();

  IF TG_OP = 'UPDATE'
    AND OLD.house IS NOT NULL
    AND NEW.house IS DISTINCT FROM OLD.house
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND current_user <> 'postgres'
  THEN
    RAISE EXCEPTION 'Selected house is locked and cannot be changed.';
  END IF;

  IF NEW.house IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.house IS NULL) THEN
    NEW.house_locked_at := COALESCE(NEW.house_locked_at, now());
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.house_locked_at := COALESCE(OLD.house_locked_at, NEW.house_locked_at);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_guard_voter_house_lock ON public.users;
CREATE TRIGGER users_guard_voter_house_lock
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_voter_house_lock();

CREATE OR REPLACE FUNCTION public.validate_house_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  locked_house text;
  candidate_house text;
  candidate_position text;
BEGIN
  SELECT u.house
  INTO locked_house
  FROM public.users AS u
  WHERE u.id = NEW.voter_id;

  IF locked_house IS NULL THEN
    RAISE EXCEPTION 'Select and lock your house before voting.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.votes AS existing_vote
    WHERE existing_vote.voter_id = NEW.voter_id
      AND existing_vote.position = NEW.position
  ) THEN
    RAISE EXCEPTION 'Duplicate votes are not allowed for the same position.';
  END IF;

  SELECT c.house, c.position
  INTO candidate_house, candidate_position
  FROM public.candidates AS c
  WHERE c.id = NEW.candidate_id;

  IF candidate_house IS NULL THEN
    RAISE EXCEPTION 'Candidate not found for the submitted vote.';
  END IF;

  IF locked_house <> NEW.house THEN
    RAISE EXCEPTION 'Votes can only be cast within the selected house.';
  END IF;

  IF candidate_house <> 'None' AND candidate_house <> NEW.house THEN
    RAISE EXCEPTION 'This candidate is not visible to the selected house.';
  END IF;

  IF candidate_position IS DISTINCT FROM NEW.position THEN
    RAISE EXCEPTION 'Vote position does not match the selected candidate.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS votes_validate_house_vote ON public.votes;
CREATE TRIGGER votes_validate_house_vote
  BEFORE INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_house_vote();

DROP POLICY IF EXISTS "Users can insert their own vote" ON public.votes;

CREATE POLICY "Users can insert their own vote"
  ON public.votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = voter_id
    AND EXISTS (
      SELECT 1
      FROM public.users AS u
      JOIN public.candidates AS c
        ON c.id = votes.candidate_id
      WHERE u.id = auth.uid()
        AND u.house IS NOT NULL
        AND u.house = votes.house
        AND (
          c.house = 'None'
          OR c.house = votes.house
        )
        AND c.position = votes.position
    )
  );
