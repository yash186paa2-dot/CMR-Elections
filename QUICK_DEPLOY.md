# 🚀 Quick Deployment Guide - CMR Voting System

**Last Updated**: June 3, 2026  
**Estimated Time**: 15 minutes

---

## ✅ Pre-Flight Checklist

Before deploying, ensure:
- [x] Build succeeds: `npm run build` ✅
- [x] Environment variables configured ✅
- [x] Supabase project created ✅
- [x] Database migrations applied ✅
- [x] At least one admin user created

---

## 🎯 Quick Start (3 Steps)

### Step 1: Verify Build (2 minutes)

```bash
# Navigate to project
cd /Users/yeshraj/Desktop/cmr\ voting\ system/project

# Test build
npm run build

# Expected: ✓ Compiled successfully
```

### Step 2: Deploy to Netlify (5 minutes)

```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod
```

**Follow prompts**:
- Create new site or link existing
- Build command: `npm run build`
- Publish directory: `.next`

### Step 3: Configure Environment (3 minutes)

In Netlify Dashboard:
1. Go to **Site Settings** > **Environment Variables**
2. Add variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xwnqdvxlguxuxbmxlhwc.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Click **Save**
4. Trigger redeploy

---

## 🗄️ Database Setup (5 minutes)

### If Not Already Done:

1. **Go to Supabase SQL Editor**
2. **Run Migration 1**:
   - Copy contents of `supabase/migrations/20260601161601_create_election_schema_v2.sql`
   - Paste in SQL Editor
   - Click **Run**

3. **Run Migration 2**:
   - Copy contents of `supabase/migrations/20260602090000_harden_voting_performance.sql`
   - Paste in SQL Editor
   - Click **Run**

4. **Verify Tables Created**:
   ```sql
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('admins', 'candidates', 'votes');
   ```
   Expected: 3 rows returned

5. **Create First Admin**:
   ```sql
   -- After first user signs in, get their ID
   SELECT id, email FROM auth.users LIMIT 5;
   
   -- Add as admin (replace with actual user_id)
   INSERT INTO admins (user_id, email) 
   VALUES ('paste-user-id-here', 'admin@cmr.ac.in');
   ```

---

## 🔐 OAuth Configuration (3 minutes)

### Update Google OAuth Redirect URL:

1. Go to **Supabase Dashboard** > **Authentication** > **Providers**
2. Click **Google**
3. Add redirect URL:
   ```
   https://your-site.netlify.app/auth/callback
   ```
4. Click **Save**

---

## ✅ Post-Deployment Testing (5 minutes)

### Test Checklist:

1. **Visit Site**: `https://your-site.netlify.app`
   - [ ] Page loads correctly
   - [ ] No console errors

2. **Test Login**: `/login`
   - [ ] Google OAuth button appears
   - [ ] Guest login works
   - [ ] Admin guest login works

3. **Test Voting**: `/`
   - [ ] Candidates display
   - [ ] Can view candidate details
   - [ ] Vote button works (guest mode)

4. **Test Admin**: `/admin`
   - [ ] Dashboard loads (as admin guest)
   - [ ] Statistics display
   - [ ] Can navigate to candidates page

5. **Test Candidate Management**: `/admin/candidates`
   - [ ] Can add candidate (without photo as guest)
   - [ ] Can edit candidate
   - [ ] Can delete candidate

6. **Test Results**: `/admin/results`
   - [ ] Results display
   - [ ] CSV export works

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to Supabase"
**Fix**: 
- Verify environment variables in Netlify
- Check Supabase URL is correct
- Ensure anon key is valid

### Issue: "Admin can't access dashboard"
**Fix**:
```sql
-- Verify admin exists
SELECT * FROM admins WHERE email = 'your@cmr.ac.in';

-- If not, add them
INSERT INTO admins (user_id, email) 
VALUES ('user-id', 'your@cmr.ac.in');
```

### Issue: "Photo upload fails"
**Fix**:
- Verify storage bucket exists: `candidate-photos`
- Check RLS policies on storage.objects
- Use real admin account (not guest) for photo uploads

### Issue: "Build fails on Netlify"
**Fix**:
- Check build logs in Netlify
- Verify all dependencies in package.json
- Ensure Node version is 18+

---

## 📊 Monitoring

### After Deployment:

1. **Check Netlify Logs**:
   - Go to Netlify Dashboard > Deploys > Deploy Log
   - Verify no errors

2. **Check Supabase Logs**:
   - Go to Supabase Dashboard > Logs
   - Monitor for errors

3. **Test All Features**:
   - Authentication
   - Voting
   - Admin functions
   - CSV export

---

## 🔄 Continuous Deployment

### Auto-Deploy from Git:

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial deployment"
   git remote add origin https://github.com/username/cmr-voting.git
   git push -u origin main
   ```

2. **Connect to Netlify**:
   - Go to Netlify Dashboard
   - Click "New site from Git"
   - Select repository
   - Configure build settings
   - Deploy

3. **Future Updates**:
   ```bash
   git add .
   git commit -m "Update feature"
   git push
   # Netlify auto-deploys!
   ```

---

## 📱 Custom Domain (Optional)

### Add Custom Domain:

1. **In Netlify Dashboard**:
   - Site Settings > Domain Management
   - Click "Add custom domain"
   - Enter your domain

2. **Update DNS**:
   - Add CNAME record at your registrar
   - Point to: `your-site.netlify.app`

3. **Update OAuth**:
   - In Supabase, add new redirect URL
   - `https://your-domain.com/auth/callback`

4. **Enable HTTPS**:
   - Netlify provides free SSL
   - Auto-enabled for custom domains

---

## 🎉 Success Criteria

Your deployment is successful when:
- ✅ Site loads without errors
- ✅ Login works (guest mode at minimum)
- ✅ Candidates display correctly
- ✅ Admin dashboard accessible
- ✅ Can add/edit/delete candidates
- ✅ Results page shows data
- ✅ CSV export downloads

---

## 📞 Need Help?

### Resources:
- **Project Analysis**: See `PROJECT_ANALYSIS_AND_FIXES.md`
- **Full Setup Guide**: See `SETUP.md`
- **Deployment Details**: See `DEPLOYMENT.md`
- **Supabase Docs**: https://supabase.com/docs
- **Netlify Docs**: https://docs.netlify.com

### Common Commands:
```bash
# Local development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## ⚡ Quick Reference

### Environment Variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xwnqdvxlguxuxbmxlhwc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Key URLs:
- **Main Site**: `/`
- **Login**: `/login`
- **Admin Dashboard**: `/admin`
- **Candidates**: `/admin/candidates`
- **Results**: `/admin/results`

### Database Tables:
- `admins` - Admin users
- `candidates` - Election candidates
- `votes` - Cast votes
- `storage.objects` - Candidate photos

---

**Ready to deploy! 🚀**

**Deployment Status**: ✅ All systems ready  
**Estimated Uptime**: 99.9%  
**Support**: Available via documentation
