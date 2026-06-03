-- ============================================
-- FIX: Add yourself as admin to enable candidate creation
-- ============================================
-- 
-- ERROR: "new row violates row-level security policy for table candidates"
-- CAUSE: You are not in the admins table
-- SOLUTION: Run this SQL in Supabase SQL Editor
--
-- ============================================

-- Step 1: Check if you're logged in and get your user ID
SELECT 
    id as user_id,
    email,
    created_at,
    'Copy this user_id for Step 2' as note
FROM auth.users 
WHERE email LIKE '%@cmr.ac.in'
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Add yourself as admin
-- IMPORTANT: Replace 'YOUR-USER-ID-HERE' with the actual user_id from Step 1
-- IMPORTANT: Replace 'your-email@cmr.ac.in' with your actual email

INSERT INTO admins (user_id, email) 
VALUES (
    'YOUR-USER-ID-HERE',  -- Replace with your user_id from Step 1
    'your-email@cmr.ac.in'  -- Replace with your email
)
ON CONFLICT (email) DO NOTHING;

-- Step 3: Verify you're now an admin
SELECT 
    a.id,
    a.email,
    a.created_at,
    u.email as auth_email,
    'You are now an admin!' as status
FROM admins a
JOIN auth.users u ON u.id = a.user_id
WHERE a.email LIKE '%@cmr.ac.in';

-- ============================================
-- ALTERNATIVE: If you don't have a user yet
-- ============================================

-- Option A: Login as Guest Admin (temporary testing)
-- 1. Go to /login
-- 2. Click "Login as Guest (Admin)"
-- 3. You can add candidates WITHOUT photos
-- 4. Photo uploads require real admin authentication

-- Option B: Create a real admin account
-- 1. Go to /login
-- 2. Enter your @cmr.ac.in email
-- 3. Click "Send Magic Link"
-- 4. Check your email and click the link
-- 5. Come back here and run Steps 1-3 above

-- ============================================
-- QUICK FIX: Temporarily disable RLS (NOT RECOMMENDED FOR PRODUCTION)
-- ============================================
-- Only use this for testing, then re-enable RLS!

-- Disable RLS temporarily (TESTING ONLY)
-- ALTER TABLE candidates DISABLE ROW LEVEL SECURITY;

-- After testing, RE-ENABLE RLS:
-- ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFY RLS POLICIES
-- ============================================

-- Check current RLS policies on candidates table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'candidates'
ORDER BY policyname;

-- Expected policies:
-- 1. "Admins can insert candidates" - FOR INSERT
-- 2. "Admins can update candidates" - FOR UPDATE  
-- 3. "Admins can delete candidates" - FOR DELETE
-- 4. "Authenticated users can read candidates" - FOR SELECT
-- 5. "Public can preview candidates" - FOR SELECT

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If you still get RLS errors after adding yourself as admin:

-- 1. Check if you're actually logged in
SELECT auth.uid() as current_user_id, auth.email() as current_email;

-- 2. Check if your user_id matches the admins table
SELECT 
    auth.uid() as my_user_id,
    EXISTS(SELECT 1 FROM admins WHERE user_id = auth.uid()) as am_i_admin
FROM auth.users
LIMIT 1;

-- 3. If am_i_admin is FALSE, you need to add yourself using Step 2 above

-- ============================================
-- COMPLETE SOLUTION
-- ============================================

-- Run this complete script (replace YOUR-USER-ID and YOUR-EMAIL):

DO $$
DECLARE
    v_user_id uuid;
    v_email text := 'your-email@cmr.ac.in'; -- CHANGE THIS
BEGIN
    -- Get the user ID for the email
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = v_email;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User not found. Please login first at /login';
    ELSE
        -- Add as admin
        INSERT INTO admins (user_id, email) 
        VALUES (v_user_id, v_email)
        ON CONFLICT (email) DO NOTHING;
        
        RAISE NOTICE 'Success! % is now an admin', v_email;
    END IF;
END $$;
