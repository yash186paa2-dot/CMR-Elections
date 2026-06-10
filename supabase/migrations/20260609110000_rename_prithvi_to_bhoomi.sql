-- Migration: Update House Names and Constraints
-- Date: 2026-06-09
-- Description: Standardizes 'Prithvi House' to 'Bhoomi House' across all tables.

-- 1. Update data in candidates table
UPDATE public.candidates SET house = 'Bhoomi House' WHERE house = 'Prithvi House';

-- 2. Update data in votes table
UPDATE public.votes SET house = 'Bhoomi House' WHERE house = 'Prithvi House';

-- 3. Update data in students table
UPDATE public.students SET class = 'Bhoomi House' WHERE class = 'Prithvi House';

-- 4. Re-apply candidates constraint
ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS candidates_house_check;
ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_house_check
  CHECK (house IN ('None', 'Agni House', 'Jal House', 'Bhoomi House', 'Vayu House'));

-- 5. Re-apply votes constraint
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_house_check;
ALTER TABLE public.votes
  ADD CONSTRAINT votes_house_check
  CHECK (house IS NULL OR house IN ('Agni House', 'Jal House', 'Bhoomi House', 'Vayu House'));

-- 6. Re-apply students constraint
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_class_check;
ALTER TABLE public.students
  ADD CONSTRAINT students_class_check
  CHECK (class IN ('Agni House', 'Jal House', 'Bhoomi House', 'Vayu House'));
