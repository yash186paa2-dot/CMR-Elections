/*
  Harden voting for busy election windows.

  - Allows guest previews to read candidates.
  - Ensures inserted vote positions match the selected candidate.
  - Adds indexes for common voter/admin result queries.
*/

CREATE UNIQUE INDEX IF NOT EXISTS admins_user_id_idx ON admins(user_id);
CREATE INDEX IF NOT EXISTS candidates_position_name_idx ON candidates(position, name);
CREATE INDEX IF NOT EXISTS votes_voter_id_idx ON votes(voter_id);
CREATE INDEX IF NOT EXISTS votes_candidate_id_idx ON votes(candidate_id);
CREATE INDEX IF NOT EXISTS votes_position_created_at_idx ON votes(position, created_at DESC);

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'candidates'
      AND policyname = 'Public can preview candidates'
  ) THEN
    CREATE POLICY "Public can preview candidates"
      ON candidates FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can insert their own vote" ON votes;

CREATE POLICY "Users can insert their own vote"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = voter_id
    AND EXISTS (
      SELECT 1
      FROM candidates
      WHERE candidates.id = votes.candidate_id
        AND candidates.position = votes.position
    )
  );

DROP POLICY IF EXISTS "Admins can delete candidates" ON candidates;

CREATE POLICY "Admins can delete candidates"
  ON candidates FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

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
