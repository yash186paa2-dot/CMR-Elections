# Admin Account Setup

## Quick Setup Steps

### 1. Create Admin User in Supabase

Go to your **Supabase Dashboard** → **Authentication** → **Users** → Click **Add user**

Fill in:
- **Email:** `CMR2026Elections@cmr.ac.in`
- **Password:** `7090`
- ✅ Check "Auto confirm user"

Click **Create user**

### 2. Add User to Admins Table

Go to **SQL Editor** in your Supabase dashboard and run this query:

```sql
INSERT INTO admins (user_id, email) 
SELECT id, email FROM auth.users 
WHERE email = 'CMR2026Elections@cmr.ac.in';
```

### 3. Test Admin Login

1. Start the app: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Click **Admin** tab
4. Enter:
   - **Email:** `CMR2026Elections@cmr.ac.in`
   - **Password:** `7090`
5. Click **Admin Login**
6. You should see the admin dashboard with stats and management options

---

## Credentials

- **Email:** `CMR2026Elections@cmr.ac.in`
- **Password:** `7090`
- **Username:** CMR2026Elections

## Features Available to Admin

- 📊 Real-time election statistics
- 👥 Candidate management (add/edit/delete)
- 📈 Results dashboard with charts
- 📥 CSV export of results
- 🔄 Live vote updates

---

## Guest Access

Students can also click **"Login as Guest"** to:
- View all candidates
- See candidate details
- Browse positions

But they won't be able to save votes without logging in with their @cmr.ac.in email.

---

## Troubleshooting

If you get "Invalid credentials" error:
- Make sure the user is auto-confirmed in Supabase
- Verify the email is exactly `CMR2026Elections@cmr.ac.in`
- Make sure the user was added to the `admins` table

If you forgot the password, go to Supabase → Users → Find the user → Reset password or delete and recreate.
