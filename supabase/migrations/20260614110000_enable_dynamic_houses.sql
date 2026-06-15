-- Migration: Enable Dynamic Houses
-- Date: 2026-06-14
-- Description: Removes hardcoded house name constraints to allow dynamic houses from the 'houses' table.

-- 1. Remove constraints from candidates
ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS candidates_house_check;
ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS candidates_house_check_v2;
ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS candidates_house_check_v3;

-- 2. Remove constraints from votes
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_house_check;

-- 3. Remove constraints from students
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_class_check;

-- 4. Update the validation trigger to be more flexible
-- It already checks against the candidate's house, so it's mostly fine,
-- but let's ensure it doesn't have any hidden hardcoded logic.
-- (Checked lib/ai-agent.ts and migrations, it seems to rely on student.class and candidate.house)
