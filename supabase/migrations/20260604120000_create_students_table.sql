/*
  Roll-number student registry.

  Actual students table columns:
  - id
  - roll_no
  - name
  - dob
  - class
  - has_voted
  - created_at
  - auth_user_id
*/

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_no text NOT NULL,
  name text NOT NULL DEFAULT '',
  dob date NOT NULL,
  class text NOT NULL DEFAULT '',
  has_voted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT students_roll_no_unique UNIQUE (roll_no)
);

CREATE INDEX IF NOT EXISTS students_roll_no_idx ON students (roll_no);
CREATE INDEX IF NOT EXISTS students_auth_user_id_idx ON students (auth_user_id);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.normalize_student_roll_no()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.roll_no := upper(trim(NEW.roll_no));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS students_normalize_roll_no ON students;
CREATE TRIGGER students_normalize_roll_no
  BEFORE INSERT OR UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_student_roll_no();

COMMENT ON TABLE students IS 'Registered students who authenticate with roll number + DOB';
