-- 1. Fix candidate photo URLs by replacing 'candidate%20photos' with 'candidate-photos'
UPDATE candidates 
SET photo_url = REPLACE(photo_url, 'candidate%20photos', 'candidate-photos')
WHERE photo_url LIKE '%candidate%20photos%';

-- 2. Restore 'house' column to candidates table if missing
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS house text DEFAULT 'None';

-- 3. Update any existing 'Bhoomi House' to 'Prithvi House'
UPDATE candidates SET house = 'Prithvi House' WHERE house = 'Bhoomi House';
UPDATE students SET class = 'Prithvi House' WHERE class = 'Bhoomi House';

-- 4. Ensure valid house names in candidates
-- Note: 'None' is allowed for candidates visible to all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'candidates_house_check_v2' 
    AND conrelid = 'public.candidates'::regclass
  ) THEN
    ALTER TABLE public.candidates 
      ADD CONSTRAINT candidates_house_check_v2 
      CHECK (house IN ('None', 'Agni House', 'Jal House', 'Prithvi House', 'Vayu House'));
  END IF;
END $$;

-- 5. Fix any candidates with NULL house
UPDATE candidates SET house = 'None' WHERE house IS NULL;
