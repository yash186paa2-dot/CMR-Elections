/*
  House-based voting redesign.

  - Adds `house` to candidates and votes.
  - Adds public `users` table to track each authenticated voter's locked house.
  - Prevents duplicate votes and house switching after a house is locked.
*/

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  full_name text NOT NULL DEFAULT '',
  house text,
  house_locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_house_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_house_check
      CHECK (
        house IS NULL
        OR house IN ('Agni House', 'Jal House', 'Bhoomi House', 'Vayu House')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_house_idx ON public.users(house);

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

ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS house text;

UPDATE public.candidates
SET house = 'Agni House'
WHERE house IS NULL OR trim(house) = '';

ALTER TABLE public.candidates
  ALTER COLUMN house SET DEFAULT 'Agni House';

ALTER TABLE public.candidates
  ALTER COLUMN house SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'candidates_house_check'
      AND conrelid = 'public.candidates'::regclass
  ) THEN
    ALTER TABLE public.candidates
      ADD CONSTRAINT candidates_house_check
      CHECK (house IN ('Agni House', 'Jal House', 'Bhoomi House', 'Vayu House'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS candidates_house_position_name_idx
  ON public.candidates(house, position, name);

ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS house text;

UPDATE public.votes AS v
SET house = c.house
FROM public.candidates AS c
WHERE c.id = v.candidate_id
  AND (v.house IS NULL OR trim(v.house) = '');

ALTER TABLE public.votes
  ALTER COLUMN house SET DEFAULT 'Agni House';

ALTER TABLE public.votes
  ALTER COLUMN house SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'votes_house_check'
      AND conrelid = 'public.votes'::regclass
  ) THEN
    ALTER TABLE public.votes
      ADD CONSTRAINT votes_house_check
      CHECK (house IN ('Agni House', 'Jal House', 'Bhoomi House', 'Vayu House'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS votes_house_created_at_idx
  ON public.votes(house, created_at DESC);

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
  ) THEN
    RAISE EXCEPTION 'Duplicate votes are not allowed.';
  END IF;

  SELECT c.house, c.position
  INTO candidate_house, candidate_position
  FROM public.candidates AS c
  WHERE c.id = NEW.candidate_id;

  IF candidate_house IS NULL THEN
    RAISE EXCEPTION 'Candidate not found for the submitted vote.';
  END IF;

  IF locked_house <> NEW.house OR candidate_house <> NEW.house THEN
    RAISE EXCEPTION 'Votes can only be cast within the selected house.';
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
        AND c.house = votes.house
        AND c.position = votes.position
    )
  );
