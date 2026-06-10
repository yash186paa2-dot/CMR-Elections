-- Migration: Add unique constraint to auth_user_id in students table
-- Date: 2026-06-09

-- Ensure auth_user_id is unique so that upsert (ON CONFLICT) works correctly
ALTER TABLE public.students ADD CONSTRAINT students_auth_user_id_unique UNIQUE (auth_user_id);

COMMENT ON CONSTRAINT students_auth_user_id_unique ON public.students IS 'Required for upserting house selection based on authenticated user ID';
