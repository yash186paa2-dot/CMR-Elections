-- Fix candidate photos bucket name
-- This ensures the bucket exists with the correct name: candidate-photos (with hyphen)

-- Delete any bucket with incorrect name (with space) if it exists
DELETE FROM storage.buckets WHERE id = 'candidate photos';

-- Ensure the correct bucket exists (with hyphen)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidate-photos',
  'candidate-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Recreate RLS policies for the bucket
DROP POLICY IF EXISTS "Admins can upload candidate photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update candidate photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete candidate photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can read candidate photos" ON storage.objects;

CREATE POLICY "Admins can upload candidate photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-photos'
    AND EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update candidate photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'candidate-photos'
    AND EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    bucket_id = 'candidate-photos'
    AND EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can delete candidate photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'candidate-photos'
    AND EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Public can read candidate photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'candidate-photos');
