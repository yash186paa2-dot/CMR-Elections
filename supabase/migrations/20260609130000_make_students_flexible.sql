-- Migration: Make students table flexible for Google OAuth users
-- Date: 2026-06-09

-- 1. Make roll_no and dob nullable to support Google OAuth users who might not have them initially
ALTER TABLE public.students ALTER COLUMN roll_no DROP NOT NULL;
ALTER TABLE public.students ALTER COLUMN dob DROP NOT NULL;

-- 2. Update house selection loop fix logic: 
-- Allow students to insert their own record if they don't have one (for Google OAuth users)
DROP POLICY IF EXISTS "Students can insert their own record" ON public.students;
CREATE POLICY "Students can insert their own record"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- 3. Ensure students can update their own house (already exists but re-verifying)
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
