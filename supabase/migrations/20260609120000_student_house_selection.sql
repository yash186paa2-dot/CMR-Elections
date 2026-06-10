-- Migration: Student House Selection and RLS
-- Date: 2026-06-09

-- 1. Enable RLS and add policies for students table
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read their own record" ON public.students;
CREATE POLICY "Students can read their own record"
  ON public.students FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Students can update their own house" ON public.students;
CREATE POLICY "Students can update their own house"
  ON public.students FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (
    auth.uid() = auth_user_id 
    AND (
      -- Only allow updating 'class' if they haven't voted yet
      NOT has_voted
    )
  );

-- 2. Trigger to mark has_voted = true on first vote
CREATE OR REPLACE FUNCTION public.sync_student_voted_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.students
  SET has_voted = true
  WHERE auth_user_id = NEW.voter_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_student_voted_status ON public.votes;
CREATE TRIGGER tr_sync_student_voted_status
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_student_voted_status();

-- 3. Ensure check constraint for house names is correct after renaming
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_class_check;
ALTER TABLE public.students
  ADD CONSTRAINT students_class_check
  CHECK (class IN ('', 'Agni House', 'Jal House', 'Bhoomi House', 'Vayu House'));
