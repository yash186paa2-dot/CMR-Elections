# CMR Voting System - Quick Reference Guide

## 🎯 System Overview

```
┌─────────────────────────────────────────┐
│   CMR Student Council Election System   │
├─────────────────────────────────────────┤
│  🔐 Authentication: Google OAuth        │
│  🗳️  Voting: One per position           │
│  👨‍💼 Admin: Full candidate management    │
│  📊 Results: Real-time analytics        │
│  💾 Export: CSV download                │
└─────────────────────────────────────────┘
```

---

## 🌐 URLs & Routes

### Public Pages
| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Main voting interface | ✅ Ready |
| `/login` | Google OAuth login | ✅ Ready |
| `/auth/callback` | OAuth redirect | ✅ Ready |

### Admin Pages
| Route | Purpose | Access | Status |
|-------|---------|--------|--------|
| `/admin` | Dashboard & stats | Admin only | ✅ Ready |
| `/admin/candidates` | Manage candidates | Admin only | ✅ Ready |
| `/admin/results` | Results & analytics | Admin only | ✅ Ready |

---

## 🔑 Key Features at a Glance

### Voting Page (`/`)
```
Header
├── Logo & Title
├── Admin Dashboard Button (if admin)
├── User Info & Sign Out
└── Hero Banner (Voting Status)

Content
├── Position Tabs (All, President, etc.)
└── Candidate Cards
    ├── Photo
    ├── Name & Position
    ├── Department & Year
    ├── Vote Button
    └── Voted Badge (if voted)

Modals
├── Vote Confirmation
├── Vote Success
└── Error Message
```

### Admin Dashboard (`/admin`)
```
Sidebar
├── Dashboard (current)
├── Manage Candidates
├── Results & Stats
└── Sign Out

Content
├── Statistics Cards
│  ├── Total Votes
│  ├── Unique Voters
│  ├── Candidates
│  └── Positions
└── Top Candidates Leaderboard
```

### Candidate Manager (`/admin/candidates`)
```
Sidebar
├── Dashboard
├── Manage Candidates (current)
├── Results & Stats
└── Sign Out

Content
├── Add Candidate Button
├── Candidates by Position
│  ├── Edit Button
│  ├── Delete Button
│  └── Vote Count
└── Add/Edit Modal
   ├── Name, Position (required)
   ├── Department, Year
   ├── Photo URL
   ├── Bio, Manifesto
   └── Save/Cancel
```

### Results Dashboard (`/admin/results`)
```
Sidebar
├── Dashboard
├── Manage Candidates
├── Results & Stats (current)
└── Sign Out

Content
├── Summary Statistics
├── Position Selector Buttons
├── Vote Charts & Rankings
│  ├── Candidate names
│  ├── Vote counts
│  ├── Percentages
│  └── Colored bars
├── Leading Candidate Display
├── All Positions Table
└── Export CSV Button
```

---

## 👤 User Roles

### Student (Voter)
```
Login → View Candidates → Vote → See Results
Permissions:
  ✅ View all candidates
  ✅ Cast votes (one per position)
  ✅ See own voting progress
  ✅ See public results
  ❌ Manage candidates
  ❌ View admin stats
```

### Admin
```
Login → Manage Candidates → View Dashboard → Export Results
Permissions:
  ✅ All voter permissions
  ✅ Add/Edit/Delete candidates
  ✅ View real-time dashboard
  ✅ View detailed results
  ✅ Export data as CSV
```

---

## 📊 Data Objects

### Candidate
```typescript
{
  id: string;           // UUID
  name: string;         // "John Doe"
  position: string;     // "President"
  department: string;   // "CSE"
  year: string;         // "3rd Year"
  bio: string;          // "Description"
  photo_url: string;    // "https://..."
  manifesto: string;    // "Campaign promises"
  vote_count: number;   // Auto-updated
  created_at: string;   // ISO timestamp
}
```

### Vote
```typescript
{
  id: string;             // UUID
  voter_id: string;       // User's UUID
  voter_email: string;    // "user@cmr.ac.in"
  candidate_id: string;   // Candidate UUID
  position: string;       // "President"
  created_at: string;     // ISO timestamp
}
```

---

## ⚡ Common Actions

### Login
1. Go to `/login`
2. Click "Continue with Google"
3. Select CMR email
4. Redirected to voting page

### Vote
1. Click candidate card
2. Review details in modal
3. Click "Confirm Vote"
4. See success message
5. Move to next position

### Add Candidate (Admin)
1. Go to `/admin/candidates`
2. Click "Add Candidate"
3. Fill form (Name, Position required)
4. Add photo, bio, manifesto (optional)
5. Click "Save Candidate"

### View Results (Admin)
1. Go to `/admin/results`
2. Select position from tabs
3. See vote distribution
4. Click "Export as CSV" for download

---

## 🔒 Security at a Glance

| Layer | Mechanism | Status |
|-------|-----------|--------|
| **Auth** | Google OAuth + Session | ✅ Active |
| **Domain** | @cmr.ac.in restriction | ✅ Active |
| **Database** | RLS policies | ✅ Active |
| **Votes** | UNIQUE(voter_id, position) | ✅ Active |
| **Admin** | Role verification | ✅ Active |
| **Encryption** | HTTPS + Supabase encryption | ✅ Active |

---

## 📈 Metrics to Monitor

### Real-time Dashboard Metrics
- **Total Votes**: Sum of all votes cast
- **Unique Voters**: Count of students who voted
- **Vote Distribution**: Votes per position
- **Leading Candidates**: Top 5 by votes

### Performance Metrics
- **Vote Success Rate**: % of successful submissions
- **Page Load Time**: < 3 seconds
- **Dashboard Refresh**: Every 5 seconds
- **Export Time**: < 2 seconds

---

## ⚙️ Configuration

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Admin Setup
```sql
-- Add admin user
INSERT INTO admins (user_id, email) 
VALUES ('user-uuid', 'admin@cmr.ac.in');
```

### Candidate Setup
- Add via `/admin/candidates` (UI)
- Or via Supabase SQL Editor (direct)

---

## 🐛 Troubleshooting Quick Links

### Authentication Issues
- [ ] Check `.env.local` file exists
- [ ] Verify Supabase URL and key
- [ ] Ensure Google OAuth configured
- [ ] Check email domain is @cmr.ac.in

### Voting Issues
- [ ] Verify user not already voted
- [ ] Check network connection
- [ ] Clear browser cache
- [ ] Try different position

### Admin Issues
- [ ] Verify in `admins` table
- [ ] Check RLS policies
- [ ] Verify user role
- [ ] Try browser refresh

### Data Issues
- [ ] Verify migration ran
- [ ] Check Supabase console
- [ ] View database logs
- [ ] Re-run migration if needed

---

## 📱 Responsive Breakpoints

| Device | Width | Status |
|--------|-------|--------|
| Mobile | 320px-480px | ✅ Optimized |
| Tablet | 768px-1024px | ✅ Optimized |
| Desktop | 1920px+ | ✅ Optimized |

---

## 🎓 Learning Path

1. **Authentication** → `components/auth-provider.tsx`
2. **Voting Logic** → `app/page.tsx`
3. **Admin Dashboard** → `app/admin/page.tsx`
4. **Candidate CRUD** → `app/admin/candidates/page.tsx`
5. **Results** → `app/admin/results/page.tsx`
6. **Database** → `supabase/migrations/*.sql`

---

## 💾 Backup & Maintenance

### Weekly Tasks
- [ ] Verify vote counts accuracy
- [ ] Check error logs
- [ ] Monitor database size

### Before Election
- [ ] Test full voting flow
- [ ] Verify admin access
- [ ] Check candidate list
- [ ] Test CSV export

### During Election
- [ ] Monitor dashboard
- [ ] Watch for errors
- [ ] Track participation rate

### After Election
- [ ] Export final results
- [ ] Back up database
- [ ] Archive vote data
- [ ] Generate report

---

## 🚀 Launch Checklist

- [ ] All dependencies installed
- [ ] Environment variables set
- [ ] Database migration complete
- [ ] Admin users added
- [ ] Candidates imported/created
- [ ] Google OAuth verified
- [ ] Vote test successful
- [ ] Admin access tested
- [ ] Results export tested
- [ ] Mobile view verified
- [ ] Error handling tested
- [ ] Backup plan created

---

## 📞 Support Contacts

### Technical Issues
- Check documentation files
- Review error logs in Supabase
- Check browser console (F12)

### User Issues
- Email: admin@cmr.ac.in
- Chat: College Discord
- Office: Admin Building Room 101

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Complete feature documentation |
| `SETUP.md` | Installation & configuration |
| `TESTING.md` | Testing & verification |
| `ARCHITECTURE.md` | Technical deep dive |
| `IMPLEMENTATION_SUMMARY.md` | Project summary |
| `QUICK_REFERENCE.md` | This file |

---

## 🎉 Quick Win Scripts

### Start Development
```bash
npm run dev
# Visit http://localhost:3000
```

### Build for Production
```bash
npm run build
npm start
```

### Deploy to Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

---

**Version**: 2.0 (Complete)
**Last Updated**: June 2, 2026
**Status**: ✅ Production Ready

🗳️ **Ready to run the election!**
