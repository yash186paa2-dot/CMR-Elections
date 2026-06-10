-- Migration: Fix students house update RLS for nullable has_voted
-- Date: 2026-06-10

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can update their own house" ON public.students;
CREATE POLICY "Students can update their own house"
  ON public.students FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = auth_user_id
    AND COALESCE(has_voted, false) = false
    AND (class IS NULL OR class = '')
  )
  WITH CHECK (
    auth.uid() = auth_user_id
    AND COALESCE(has_voted, false) = false
  );

DROP POLICY IF EXISTS "Students can insert their own record" ON public.students;
CREATE POLICY "Students can insert their own record"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Students can read their own record" ON public.students;
CREATE POLICY "Students can read their own record"
  ON public.students FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);
