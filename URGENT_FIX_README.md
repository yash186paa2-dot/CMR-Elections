# 🚨 URGENT FIX: Candidate Creation Error

## Error Message
```
Failed to add candidate: new row violates row-level security policy for table "candidates"
```

## 🎯 Root Cause
You are **not in the `admins` table**. The RLS policy requires you to be an admin to create candidates.

---

## ✅ SOLUTION (Choose One)

### Option 1: Quick Fix - Add Yourself as Admin (5 minutes) ⭐ RECOMMENDED

1. **Login to your app first**:
   - Go to `http://localhost:3000/login`
   - Enter your `@cmr.ac.in` email
   - Click "Send Magic Link"
   - Check email and click the link
   - You should be logged in

2. **Go to Supabase SQL Editor**:
   - Open Supabase Dashboard
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Get your User ID**:
   ```sql
   SELECT id, email FROM auth.users 
   WHERE email LIKE '%@cmr.ac.in'
   ORDER BY created_at DESC;
   ```
   - Copy the `id` value (it looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

4. **Add yourself as admin**:
   ```sql
   INSERT INTO admins (user_id, email) 
   VALUES (
       'paste-your-id-here',  -- Replace with ID from step 3
       'your-email@cmr.ac.in'  -- Replace with your email
   );
   ```
   - Click "Run"
   - You should see: "Success. 1 row affected."

5. **Verify it worked**:
   ```sql
   SELECT * FROM admins;
   ```
   - You should see your email in the results

6. **Refresh your browser** and try adding a candidate again!

---

### Option 2: Use Guest Admin Mode (Temporary Testing)

**Limitations**: Can add candidates WITHOUT photos only

1. Go to `http://localhost:3000/login`
2. Click **"Login as Guest (Admin)"** button
3. Go to `/admin/candidates`
4. Add candidates (leave photo field empty or use URL)
5. This works for testing but photo uploads will fail

---

### Option 3: Temporarily Disable RLS (NOT RECOMMENDED)

**⚠️ WARNING**: Only for local testing, never in production!

```sql
-- In Supabase SQL Editor
ALTER TABLE candidates DISABLE ROW LEVEL SECURITY;
```

After testing, **IMMEDIATELY re-enable**:
```sql
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
```

---

## 🔍 Verify You're an Admin

Run this in Supabase SQL Editor:

```sql
-- Check if you're logged in
SELECT auth.uid() as my_user_id, auth.email() as my_email;

-- Check if you're an admin
SELECT 
    EXISTS(SELECT 1 FROM admins WHERE user_id = auth.uid()) as am_i_admin;
```

If `am_i_admin` is `false`, you need to add yourself using Option 1 above.

---

## 📋 Complete Step-by-Step Guide

### Step 1: Login to the App
```
1. Open browser: http://localhost:3000/login
2. Enter: your-name@cmr.ac.in
3. Click: "Send Magic Link"
4. Check email inbox
5. Click the magic link in email
6. You're now logged in!
```

### Step 2: Open Supabase Dashboard
```
1. Go to: https://supabase.com/dashboard
2. Select your project: xwnqdvxlguxuxbmxlhwc
3. Click: "SQL Editor" (left sidebar)
4. Click: "New query"
```

### Step 3: Find Your User ID
```sql
-- Paste this and click "Run"
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;
```
**Copy the `id` value** (looks like: `123e4567-e89b-12d3-a456-426614174000`)

### Step 4: Add Yourself as Admin
```sql
-- Replace BOTH values below, then click "Run"
INSERT INTO admins (user_id, email) 
VALUES (
    '123e4567-e89b-12d3-a456-426614174000',  -- YOUR ID HERE
    'your-name@cmr.ac.in'                     -- YOUR EMAIL HERE
);
```

### Step 5: Verify Success
```sql
-- Click "Run" to verify
SELECT * FROM admins;
```
You should see your email in the results! ✅

### Step 6: Try Adding Candidate Again
```
1. Go back to: http://localhost:3000/admin/candidates
2. Click: "Add Candidate"
3. Fill in the form
4. Click: "Save Candidate"
5. It should work now! 🎉
```

---

## 🐛 Still Not Working?

### Check 1: Are you logged in?
```sql
SELECT auth.uid(), auth.email();
```
- If both are `NULL`, you're not logged in
- Go to `/login` and login again

### Check 2: Is your user_id in admins table?
```sql
SELECT * FROM admins WHERE user_id = auth.uid();
```
- If no results, run Step 4 again

### Check 3: Are RLS policies enabled?
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'candidates';
```
- `rowsecurity` should be `true`

### Check 4: Do the policies exist?
```sql
SELECT policyname FROM pg_policies 
WHERE tablename = 'candidates';
```
- Should show 5 policies including "Admins can insert candidates"

---

## 🎯 Why This Happens

The RLS policy on the `candidates` table checks:
```sql
WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
)
```

This means:
- ✅ Only users in the `admins` table can insert candidates
- ❌ Regular users cannot insert candidates
- ❌ Guest users cannot insert candidates (they're not in the database)

**Solution**: Add yourself to the `admins` table!

---

## 📞 Quick Help

### I don't have a @cmr.ac.in email
**Solution**: 
1. Update the domain restriction in `components/auth-provider.tsx` (line 75)
2. Change `@cmr.ac.in` to your domain
3. Restart the dev server

### I can't receive the magic link email
**Solution**:
1. Check Supabase email settings
2. Use "Login as Guest (Admin)" for testing
3. Or use password authentication instead

### The SQL queries don't work
**Solution**:
1. Make sure you're in the correct Supabase project
2. Check you're in the SQL Editor (not Table Editor)
3. Make sure you click "Run" after pasting the query

---

## ✅ Success Checklist

After following the fix:
- [ ] You can see your email in `SELECT * FROM admins`
- [ ] `SELECT auth.uid()` returns your user ID
- [ ] You can access `/admin/candidates`
- [ ] You can click "Add Candidate" button
- [ ] You can fill the form and save
- [ ] Candidate appears in the list
- [ ] No RLS error appears

---

## 🚀 Next Steps After Fix

1. ✅ Add your first candidate
2. ✅ Test editing a candidate
3. ✅ Test deleting a candidate
4. ✅ Test uploading a photo
5. ✅ Test voting for the candidate
6. ✅ Check the results dashboard

---

**Need more help?** Check `FIX_ADMIN_ACCESS.sql` for detailed SQL queries.
