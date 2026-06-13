-- Unify election settings and ensure all keys exist
INSERT INTO election_settings (key, value)
VALUES
  ('timer_enabled', 'false'::jsonb),
  ('timer_duration', '60'::jsonb),
  ('timer_status', '"stopped"'::jsonb),
  ('timer_start_time', 'null'::jsonb),
  ('election_status', '"closed"'::jsonb),
  ('results_visibility', '"hidden"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Update types if they were stored incorrectly (legacy)
UPDATE election_settings SET value = '"stopped"'::jsonb WHERE key = 'timer_status' AND (value IS NULL OR value = 'null'::jsonb);
UPDATE election_settings SET value = '"closed"'::jsonb WHERE key = 'election_status' AND (value IS NULL OR value = 'null'::jsonb);
UPDATE election_settings SET value = '"hidden"'::jsonb WHERE key = 'results_visibility' AND (value IS NULL OR value = 'null'::jsonb);
