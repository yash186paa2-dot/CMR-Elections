# Deployment Guide - CMR Voting System

## 🚀 Pre-Deployment Checklist

### Development Setup ✅
- [x] All dependencies installed
- [x] TypeScript compiles without errors
- [x] ESLint passes validation
- [x] Database migration created
- [x] Environment variables documented

### Feature Verification ✅
- [x] Google OAuth working
- [x] Voting flow complete
- [x] Admin dashboard operational
- [x] Candidate management functional
- [x] Results dashboard live
- [x] CSV export working
- [x] Error handling tested
- [x] One-vote protection active

### Security Verification ✅
- [x] RLS policies in place
- [x] Admin authorization verified
- [x] Domain restriction active
- [x] Vote encryption enabled
- [x] UNIQUE constraints enforced

---

## 🌐 Deployment Platforms

### Option 1: Netlify (Recommended - Pre-configured)

#### Step 1: Build Configuration
Netlify config is already in `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[dev]
  framework = "nextjs"
```

#### Step 2: Deploy via CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

#### Step 3: Configure Environment Variables
In Netlify Dashboard:
1. Go to Site Settings > Build & Deploy > Environment
2. Add variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

#### Step 4: Update Google OAuth
In Supabase Dashboard:
1. Authentication > Providers > Google
2. Add redirect URL: `https://your-site.netlify.app/auth/callback`

#### Step 5: Deploy
```bash
# Automatic deployment from git
# Push to main branch → Netlify auto-deploys
```

---

### Option 2: Vercel

#### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/cmr-voting.git
git push -u origin main
```

#### Step 2: Connect to Vercel
1. Go to vercel.com
2. Click "New Project"
3. Import GitHub repository
4. Configure build settings:
   - Framework: Next.js
   - Build command: `npm run build`
   - Output directory: `.next`

#### Step 3: Add Environment Variables
In Vercel Dashboard:
1. Settings > Environment Variables
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Step 4: Update OAuth URLs
In Supabase:
1. Add redirect: `https://your-project.vercel.app/auth/callback`

---

### Option 3: Self-Hosted (Docker)

#### Step 1: Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

ENV NODE_ENV production

EXPOSE 3000

CMD ["npm", "start"]
```

#### Step 2: Build & Run
```bash
# Build image
docker build -t cmr-voting .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  cmr-voting
```

#### Step 3: Deploy to AWS/GCP/Azure
Follow platform-specific Docker deployment guides

---

## 🗄️ Database Deployment

### Step 1: Create Supabase Project
1. Go to supabase.com
2. Create new project
3. Copy URL and anon key

### Step 2: Run Migration
```sql
-- Copy entire migration file content
-- Paste in Supabase SQL Editor
-- Click Run
```

### Step 3: Verify Tables
In Supabase:
1. Go to Table Editor
2. Verify: `admins`, `candidates`, `votes` exist
3. Check RLS policies enabled

### Step 4: Seed Initial Data
Initial candidates are auto-seeded from migration.
Or add via admin UI after deployment.

### Step 5: Enable Backups
In Supabase Dashboard:
1. Settings > Backups
2. Enable automatic daily backups

---

## 🔐 Security Hardening

### Before Going Live

#### 1. Update OAuth Redirect URL
```
Supabase > Auth > Providers > Google
Add: https://your-domain.com/auth/callback
```

#### 2. Configure CORS
```
Supabase > Settings > CORS
Add: https://your-domain.com
```

#### 3. Enable HTTPS
- All hosting platforms provide free HTTPS
- Verify in browser (lock icon)

#### 4. Set Production RLS
Verify RLS is enforced:
```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('admins', 'candidates', 'votes');
```

#### 5. Create Admin User
```sql
INSERT INTO admins (user_id, email) 
VALUES ('your-user-id', 'admin@cmr.ac.in');
```

#### 6. Disable Anonymous Access (Optional)
In Supabase:
1. Settings > Auth
2. Disable "Enable signup" if needed
3. Set "JWT expiry" to 24 hours

---

## 📊 Post-Deployment Verification

### Test Authentication
1. Visit `/login`
2. Click Google login
3. Verify redirect works
4. Check email accepted/rejected

### Test Voting
1. Login with valid email
2. Vote for a candidate
3. Verify vote count increases
4. Try voting twice (should error)

### Test Admin
1. Login as admin
2. Go to `/admin` (should work)
3. Add candidate
4. Check vote count updates
5. Export results

### Test Error Handling
1. Try voting twice for same position
2. Check error message appears
3. Dismiss error modal
4. Verify can vote for other positions

---

## 🔍 Monitoring & Maintenance

### Daily Checks
```bash
# Check error logs
# Monitor vote submission success rate
# Verify vote counts accuracy
# Watch dashboard performance
```

### Weekly Checks
```bash
# Review Supabase usage
# Check for error spikes
# Verify backup creation
# Test restore from backup
```

### Before Election
```bash
# Load test the system
# Verify admin access
# Test all candidate positions
# Confirm CSV export works
# Check mobile responsiveness
```

### During Election
```bash
# Monitor dashboard live
# Watch for errors in logs
# Track participation rate
# Check database size
```

### After Election
```bash
# Export final results
# Back up database manually
# Archive vote data
# Generate election report
```

---

## 🆘 Troubleshooting Deployment

### Issue: Blank page on `/login`
**Solution**:
1. Check environment variables
2. Verify Supabase URL is correct
3. Check browser console for errors
4. Verify CORS settings

### Issue: "Cannot POST /api..."
**Solution**:
1. Check Google OAuth configured
2. Verify redirect URL matches
3. Check Supabase settings
4. Review error logs

### Issue: RLS Policy Violations
**Solution**:
1. Verify all RLS policies created
2. Check user roles in database
3. Verify authentication state
4. Review policy logic

### Issue: Vote count not updating
**Solution**:
1. Check trigger exists
2. Verify vote inserted successfully
3. Check vote_count field is updated
4. Review database logs

### Issue: Admin can't access `/admin`
**Solution**:
1. Verify user in admins table
2. Check user_id matches
3. Verify session active
4. Clear browser cache

---

## 📈 Performance Optimization

### For Production

#### 1. Enable Caching
```bash
# In next.config.js
# Add cache headers
```

#### 2. Optimize Images
```typescript
// Already using Next.js Image component
// Images are auto-optimized
```

#### 3. Enable Compression
Netlify/Vercel auto-enables gzip

#### 4. Use CDN
- Netlify: Built-in CDN
- Vercel: Built-in edge network
- Self-hosted: Use Cloudflare

#### 5. Database Optimization
```sql
-- Create indexes
CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_votes_position ON votes(position);
CREATE INDEX idx_candidates_position ON candidates(position);
```

---

## 📱 Domain Setup

### Using Custom Domain

#### Option 1: Netlify Domain
1. Go to Netlify Dashboard
2. Site Settings > Domain
3. Click "Add custom domain"
4. Update DNS at registrar

#### Option 2: Custom Registrar (GoDaddy, Namecheap, etc.)
1. Get DNS records from hosting platform
2. Update DNS at registrar
3. Wait 24-48 hours for propagation
4. Update OAuth redirect URL

#### Update Everywhere
```
Google OAuth:
  https://your-domain.com/auth/callback

Supabase CORS:
  https://your-domain.com
```

---

## 🔄 Continuous Integration/Deployment

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Netlify

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: netlify/actions/cli@master
        with:
          args: deploy --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Supabase Database Migrations (Optional)
```bash
# Install Supabase CLI
npm install -D supabase

# Push migrations to production
supabase db push
```

---

## 🚨 Emergency Procedures

### If Votes Not Saving
1. Check database connection
2. Verify RLS policies
3. Check vote constraint
4. Review error logs
5. Roll back if necessary

### If Vote Count Wrong
1. Manual count verification
2. Run trigger manually
3. Update vote_count via SQL
4. Verify data integrity

### If Voting Frozen
1. Check Supabase status
2. Verify authentication
3. Check network connection
4. Restart application if self-hosted

### If Need to Restore
1. Go to Supabase Backups
2. Choose restore point
3. Click Restore
4. Verify data integrity

---

## ✅ Go-Live Checklist

### 1 Week Before
- [ ] Final code review
- [ ] All tests passing
- [ ] Database backup enabled
- [ ] Team training complete
- [ ] Communication plan ready

### 1 Day Before
- [ ] Staging deployment successful
- [ ] All features tested
- [ ] Error logs clear
- [ ] Team on standby
- [ ] Rollback plan documented

### Launch Day
- [ ] Deploy to production
- [ ] Verify all URLs working
- [ ] Test voting flow
- [ ] Monitor dashboard
- [ ] Have support team ready

### Post-Launch
- [ ] Monitor for 1 hour continuously
- [ ] Check error logs hourly
- [ ] Daily stats review
- [ ] Weekly performance review

---

## 📞 Support Contacts

**Technical Issues**:
- Check Supabase Status: status.supabase.com
- Review error logs
- Check documentation

**Database Issues**:
- Supabase Support: support@supabase.com
- Check backup/restore

**Deployment Issues**:
- Netlify Support: support.netlify.com
- Vercel Support: support.vercel.com

---

## 📝 Deployment Summary

**Time to Deploy**: 15-30 minutes
**Downtime**: 0 minutes (Netlify/Vercel)
**Recovery Time**: < 5 minutes
**Rollback Time**: < 2 minutes

---

**Ready to deploy! 🚀**
