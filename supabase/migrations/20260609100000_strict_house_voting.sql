-- Migration: Strict House-Based Voting
-- Date: 2026-06-09

-- 1. Ensure candidates table has the house column
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS house text DEFAULT 'None' NOT NULL;

-- 2. Ensure votes table has the house column
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS house text;

-- 3. Update candidates check constraint
ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS candidates_house_check;
ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS candidates_house_check_v2;
ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_house_check
  CHECK (house IN ('None', 'Agni House', 'Jal House', 'Prithvi House', 'Vayu House'));

-- 4. Update votes check constraint
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_house_check;
ALTER TABLE public.votes
  ADD CONSTRAINT votes_house_check
  CHECK (house IS NULL OR house IN ('Agni House', 'Jal House', 'Prithvi House', 'Vayu House'));

-- 5. Add check constraint to students class (house)
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_class_check;
ALTER TABLE public.students
  ADD CONSTRAINT students_class_check
  CHECK (class IN ('Agni House', 'Jal House', 'Prithvi House', 'Vayu House'));

-- 6. Create function to validate house-based voting
CREATE OR REPLACE FUNCTION public.validate_house_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  student_house text;
  candidate_house text;
BEGIN
  -- Get the student's house (class)
  SELECT class INTO student_house
  FROM public.students
  WHERE auth_user_id = auth.uid();

  -- If student not found or has no house, we block the vote
  IF student_house IS NULL THEN
    RAISE EXCEPTION 'Student record or house assignment not found. Please contact administration.';
  END IF;

  -- Get the candidate's house
  SELECT house INTO candidate_house
  FROM public.candidates
  WHERE id = NEW.candidate_id;

  IF candidate_house IS NULL THEN
    RAISE EXCEPTION 'Candidate not found.';
  END IF;

  -- Rule: Students can vote for General positions (house = 'None') 
  -- or their own house positions.
  IF candidate_house <> 'None' AND candidate_house <> student_house THEN
    RAISE EXCEPTION 'Strict House-Based Voting: You belong to % and cannot vote for candidates from %.', student_house, candidate_house;
  END IF;

  -- Set the house on the vote record for tracking
  NEW.house := student_house;

  RETURN NEW;
END;
$$;

-- 7. Attach the trigger to the votes table
DROP TRIGGER IF EXISTS tr_validate_house_vote ON public.votes;
CREATE TRIGGER tr_validate_house_vote
  BEFORE INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_house_vote();

-- 8. Update RLS on votes to be even stricter
DROP POLICY IF EXISTS "Users can insert their own vote" ON public.votes;
CREATE POLICY "Users can insert their own vote"
  ON public.votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = voter_id
    AND EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.candidates c ON c.id = candidate_id
      WHERE s.auth_user_id = auth.uid()
      AND (c.house = 'None' OR c.house = s.class)
    )
  );
