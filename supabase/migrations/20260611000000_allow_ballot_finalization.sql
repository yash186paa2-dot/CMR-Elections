-- Migration: Allow students to finalize their ballot by setting has_voted to true
-- Date: 2026-06-11

DROP POLICY IF EXISTS "Students can finalize their ballot" ON public.students;
CREATE POLICY "Students can finalize their ballot"
  ON public.students FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = auth_user_id
    AND COALESCE(has_voted, false) = false
  )
  WITH CHECK (
    auth.uid() = auth_user_id
  );

-- Ensure RLS is enabled
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
