-- Migration: Make students table flexible for Google OAuth users
-- Date: 2026-06-09

-- 1. Add email column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS students_email_idx ON public.students (email);

-- 2. Make roll_no and dob nullable to support Google OAuth users who might not have them initially
ALTER TABLE public.students ALTER COLUMN roll_no DROP NOT NULL;
ALTER TABLE public.students ALTER COLUMN dob DROP NOT NULL;

-- 3. Update house selection loop fix logic: 
-- Allow students to insert their own record if they don't have one (for Google OAuth users)
DROP POLICY IF EXISTS "Students can insert their own record" ON public.students;
CREATE POLICY "Students can insert their own record"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- 4. Ensure students can update their own house (already exists but re-verifying)
DROP POLICY IF EXISTS "Students can update their own house" ON public.students;
CREATE POLICY "Students can update their own house"
  ON public.students FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (
    auth.uid() = auth_user_id 
    AND (
      NOT has_voted
    )
  );

-- 5. Add comment
COMMENT ON COLUMN public.students.email IS 'Email for Google OAuth users to link with student record';
