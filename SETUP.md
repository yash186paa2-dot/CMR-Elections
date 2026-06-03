# Quick Setup Guide - CMR Voting System

## 🚀 5-Minute Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Supabase

Create `.env.local` in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Get these from: Supabase Dashboard > Project Settings > API

### Step 3: Set Up Database

1. Go to Supabase Dashboard > SQL Editor
2. Create a new query and paste the contents of:
   `supabase/migrations/20260601161601_create_election_schema_v2.sql`
3. Click "Run" to execute

This will:
- Create `admins`, `candidates`, `votes` tables
- Set up RLS policies
- Create vote count trigger
- Seed 6 sample candidates

### Step 4: Configure Google OAuth

1. Go to Supabase Dashboard > Authentication > Providers
2. Enable "Google"
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Add redirect URL: `http://localhost:3000/auth/callback`
5. (For production: `https://your-domain.com/auth/callback`)

### Step 5: Make Yourself an Admin

In Supabase SQL Editor, run:
```sql
-- First, get your user ID from the auth.users table
SELECT id, email FROM auth.users LIMIT 5;

-- Then add yourself as admin (replace user_id with your actual ID)
INSERT INTO admins (user_id, email) 
VALUES ('paste-your-user-id-here', 'your@cmr.ac.in');
```

### Step 6: Start Development Server
```bash
npm run dev
```

Visit: `http://localhost:3000`

---

## 🔧 Admin Access

After you're set up as admin:

1. **Admin Dashboard**: `http://localhost:3000/admin`
   - View live statistics
   - See top candidates

2. **Manage Candidates**: `http://localhost:3000/admin/candidates`
   - Add/Edit/Delete candidates
   - Each candidate needs: Name, Position, Photo URL

3. **View Results**: `http://localhost:3000/admin/results`
   - Real-time vote counts
   - Export results as CSV

---

## 📝 Adding Sample Candidates

Click the "Add Candidate" button on `/admin/candidates` and fill in:
- **Name**: Student name
- **Position**: President, Vice President, Secretary, Treasurer, etc.
- **Department**: CSE, ECE, Mechanical, etc.
- **Year**: 1st Year, 2nd Year, 3rd Year
- **Photo URL**: Link to candidate photo (use placeholder if needed)
- **Bio**: Short biography
- **Manifesto**: Campaign promises

---

## 🧪 Testing

### Test Vote Submission
1. Log in with your CMR account
2. Click on a candidate
3. Confirm vote in modal
4. See success message

### Test One-Vote Protection
1. Try voting for a different candidate in same position
2. You'll see: "Already Voted for This Position" error
3. This is correct behavior ✓

### Test Admin Features
1. Add a new candidate via `/admin/candidates`
2. Vote for that candidate
3. Check `/admin` - vote count should update in 5 seconds
4. Check `/admin/results` - see real-time results

---

## 🚀 Deployment (Netlify)

The project is pre-configured for Netlify deployment.

### Option 1: Deploy via CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### Option 2: Deploy via GitHub
1. Push code to GitHub
2. Connect repo to Netlify
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Set environment variables in Netlify Dashboard

### Important: Update OAuth Redirect URLs
After deploying, update in Supabase:
- Authentication > Providers > Google
- Add: `https://your-site.netlify.app/auth/callback`

---

## 📊 Sample Data

The migration includes 6 pre-made candidates:
- **President**: Arjun Sharma, Priya Mehta
- **Vice President**: Rohan Verma, Sneha Patel
- **Secretary**: Karthik Nair
- **Treasurer**: Divya Krishnan

You can delete these and add your own from the admin panel.

---

## 🐛 Common Issues

### "Connection refused"
- Check Supabase URL and keys are correct
- Verify `.env.local` file exists

### "Only @cmr.ac.in accounts permitted"
- Make sure you're logging in with CMR email
- Check Google OAuth domain settings

### "Can't access /admin"
- You must be added to the `admins` table
- Run the SQL INSERT command from Step 5

### RLS Policy Violations
- Ensure database migration ran completely
- Check Supabase > Authentication > Policies
- All policies should exist for admins, candidates, votes tables

---

## 📖 Full Documentation

See `README.md` for complete feature documentation.

---

## 💡 Quick Commands

```bash
# Development
npm run dev              # Start dev server on :3000

# Production
npm run build           # Build for production
npm run start          # Start production server

# Code Quality
npm run lint           # Check for errors
npm run typecheck      # TypeScript validation
```

---

## 🆘 Need Help?

1. Check Supabase status: https://status.supabase.com
2. Verify env variables: `cat .env.local`
3. Check browser console for errors: F12 > Console
4. Review Supabase logs: Dashboard > Logs

---

Ready to vote! 🗳️
