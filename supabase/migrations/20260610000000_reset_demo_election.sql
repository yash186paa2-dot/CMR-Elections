-- Migration: Reset Demo Election RPC and House Selection Hardening
-- Date: 2026-06-10

-- 1. Create a secure RPC to reset the demo election
CREATE OR REPLACE FUNCTION public.reset_demo_election()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only administrators can reset the election data.';
  END IF;

  -- Delete all votes
  DELETE FROM public.votes;

  -- Reset all candidate vote counts
  UPDATE public.candidates SET vote_count = 0;

  -- Reset student voting status and house selection
  UPDATE public.students SET has_voted = false, class = '';

  -- Refresh stats is handled by frontend polling or manual refresh
END;
$$;

-- 2. Update students RLS to be even stricter about house selection
-- Ensure 'class' can only be set once by the student
DROP POLICY IF EXISTS "Students can update their own house" ON public.students;
CREATE POLICY "Students can update their own house"
  ON public.students FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (
    auth.uid() = auth_user_id 
    AND (NOT has_voted)
    AND (
      -- If class was already set, it cannot be changed to a different house
      -- This ensures 'One-Time Lock' even before voting
      (SELECT class FROM public.students WHERE auth_user_id = auth.uid()) = ''
      OR 
      (SELECT class FROM public.students WHERE auth_user_id = auth.uid()) IS NULL
    )
  );

COMMENT ON FUNCTION public.reset_demo_election() IS 'Clears all votes and resets student status. Admin only.';
