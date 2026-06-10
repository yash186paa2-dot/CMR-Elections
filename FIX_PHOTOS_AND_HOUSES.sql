-- 1. Fix candidate photo URLs by replacing 'candidate%20photos' with 'candidate-photos'
UPDATE candidates 
SET photo_url = REPLACE(photo_url, 'candidate%20photos', 'candidate-photos')
WHERE photo_url LIKE '%candidate%20photos%';

-- 2. Restore 'house' column to candidates table if missing
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS house text DEFAULT 'None';

-- 3. Update any existing 'Prithvi House' to 'Bhoomi House'
UPDATE candidates SET house = 'Bhoomi House' WHERE house = 'Prithvi House';
UPDATE students SET class = 'Bhoomi House' WHERE class = 'Prithvi House';

-- 4. Ensure valid house names in candidates
-- Note: 'None' is allowed for candidates visible to all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'candidates_house_check_v3' 
    AND conrelid = 'public.candidates'::regclass
  ) THEN
    ALTER TABLE public.candidates 
      ADD CONSTRAINT candidates_house_check_v3 
      CHECK (house IN ('None', 'Agni House', 'Jal House', 'Bhoomi House', 'Vayu House'));
  END IF;
END $$;

-- 5. Fix any candidates with NULL house
UPDATE candidates SET house = 'None' WHERE house IS NULL;
