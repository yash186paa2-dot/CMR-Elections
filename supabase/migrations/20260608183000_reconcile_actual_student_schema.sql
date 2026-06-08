/*
  Reconcile local environments with the actual Supabase schema.

  Actual students table columns:
  - id
  - roll_no
  - name
  - dob
  - class
  - has_voted
  - created_at
  - auth_user_id

  This migration also removes the legacy `public.users` table and unsupported
  house-based columns from `candidates` and `votes` if they still exist.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'full_name'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'name'
  ) THEN
    ALTER TABLE public.students RENAME COLUMN full_name TO name;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'department'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'class'
  ) THEN
    ALTER TABLE public.students RENAME COLUMN department TO class;
  END IF;
END
$$;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS class text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS has_voted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE public.students
      ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE public.students DROP COLUMN IF EXISTS updated_at;

DROP TABLE IF EXISTS public.users CASCADE;
ALTER TABLE public.votes DROP COLUMN IF EXISTS house;
ALTER TABLE public.candidates DROP COLUMN IF EXISTS house;

DROP INDEX IF EXISTS users_house_idx;
DROP INDEX IF EXISTS candidates_house_position_name_idx;
DROP INDEX IF EXISTS votes_house_created_at_idx;

CREATE UNIQUE INDEX IF NOT EXISTS students_roll_no_idx ON public.students (roll_no);
CREATE INDEX IF NOT EXISTS students_auth_user_id_idx ON public.students (auth_user_id);
