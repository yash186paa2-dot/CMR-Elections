# Feature Checklist & Testing Guide

## ✅ Authentication & Access Control

### Google OAuth
- [ ] Login redirects to Google
- [ ] Only @cmr.ac.in emails are accepted
- [ ] Invalid domain emails show error
- [ ] Session persists on page reload
- [ ] Sign out clears session

### Admin Access
- [ ] Non-admins cannot access `/admin`
- [ ] Admins see "Dashboard" button in header
- [ ] Admins can navigate between admin pages
- [ ] Non-admins see regular voting interface

---

## ✅ Voting Interface (`/`)

### Candidate Display
- [ ] All candidates are visible
- [ ] Candidates are grouped by position
- [ ] Position filter tabs work
- [ ] Candidate photos load correctly
- [ ] Position, department, year are displayed
- [ ] Bio and manifesto are visible when expanded

### Vote Submission
- [ ] Click "Vote" button opens confirmation modal
- [ ] Confirmation modal shows candidate details
- [ ] Confirming vote shows success modal
- [ ] Success modal shows candidate name and position
- [ ] Vote count updates after submission
- [ ] "Voted" badge appears on candidate card

### One-Vote-Per-Position Protection
- [ ] Can vote once per position
- [ ] Attempting second vote shows error: "Already Voted for This Position"
- [ ] Vote remains from first attempt
- [ ] Error modal is dismissible

### Progress Tracking
- [ ] "Positions Voted" counter updates
- [ ] Checkmarks appear next to voted positions
- [ ] All positions show complete after voting all

---

## ✅ Admin Dashboard (`/admin`)

### Statistics
- [ ] Total Votes count is accurate
- [ ] Unique Voters count shows correct number
- [ ] Candidates count matches database
- [ ] Positions count is correct
- [ ] Stats update every 5 seconds
- [ ] Stats match actual data

### Top Candidates
- [ ] Shows top 5 candidates by votes
- [ ] Ranked numerically (1st, 2nd, 3rd, etc.)
- [ ] Vote counts are accurate
- [ ] Percentages are correct
- [ ] Vote bars scale proportionally
- [ ] Empty state shows when no votes

### Navigation
- [ ] Can navigate to Candidates page
- [ ] Can navigate to Results page
- [ ] Sidebar shows all menu items
- [ ] Active page is highlighted

---

## ✅ Candidate Management (`/admin/candidates`)

### View Candidates
- [ ] All candidates are listed
- [ ] Candidates grouped by position
- [ ] Candidate details are correct
- [ ] Vote counts are displayed
- [ ] Empty state shows when no candidates

### Add Candidate
- [ ] "Add Candidate" button opens modal
- [ ] Form shows all required fields
- [ ] Name field is required
- [ ] Position field is required
- [ ] Optional fields are optional
- [ ] Success message appears on save
- [ ] New candidate appears in list
- [ ] Vote count starts at 0

### Edit Candidate
- [ ] Edit button opens modal with data
- [ ] Form is pre-filled with candidate data
- [ ] All fields are editable
- [ ] Changes are saved correctly
- [ ] Success message appears
- [ ] Updated data appears in list

### Delete Candidate
- [ ] Delete button shows confirmation
- [ ] Candidate is removed from list
- [ ] Success message appears
- [ ] Votes for deleted candidate are preserved
- [ ] Vote counts update (if trigger set up)

### Form Validation
- [ ] Cannot save without name
- [ ] Cannot save without position
- [ ] Photo URL validation works
- [ ] Long text fields accept manifesto
- [ ] Submit button disables while saving

---

## ✅ Results Dashboard (`/admin/results`)

### Summary Statistics
- [ ] Total Votes count is accurate
- [ ] Unique Voters count is correct
- [ ] Positions count matches
- [ ] Stats are real-time

### Position Selection
- [ ] All positions appear as buttons
- [ ] Clicking position filters results
- [ ] Active position is highlighted
- [ ] Results update for selected position

### Vote Display
- [ ] Candidates are ranked by votes
- [ ] Rankings show medals (🥇 🥈 🥉)
- [ ] Vote counts are accurate
- [ ] Percentages are calculated correctly
- [ ] Vote bars show proportional widths
- [ ] Bars are colored correctly

### Leading Candidate
- [ ] Shows crown emoji (👑)
- [ ] Shows candidate name and votes
- [ ] Shows vote percentage
- [ ] Gold background styling correct

### All Positions Table
- [ ] Shows all positions
- [ ] Shows leading candidate for each
- [ ] Shows vote counts
- [ ] Shows candidate count
- [ ] Table is scrollable on mobile

### Export Results
- [ ] CSV download button works
- [ ] File downloads to computer
- [ ] CSV contains all positions
- [ ] CSV contains candidate names
- [ ] CSV contains vote counts and percentages
- [ ] CSV includes summary statistics
- [ ] Filename includes date

---

## ✅ Security & Data Integrity

### One-Vote-Per-Position
- [ ] Database prevents duplicate votes
- [ ] Error code 23505 handled
- [ ] User sees clear error message
- [ ] Error message is dismissible

### Admin Verification
- [ ] Only admins can insert candidates
- [ ] Only admins can update candidates
- [ ] Only admins can view results
- [ ] Users cannot access admin pages

### Data Privacy
- [ ] Users can only see their own votes
- [ ] Admins can see all votes (with email)
- [ ] Vote details are encrypted
- [ ] Session persists correctly

---

## ✅ UI/UX & Responsiveness

### Desktop (1920px+)
- [ ] Layout looks professional
- [ ] All buttons accessible
- [ ] No overflow content
- [ ] Cards display in grids

### Tablet (768px-1024px)
- [ ] Sidebar exists and functional
- [ ] Content scales properly
- [ ] Buttons have good size
- [ ] Forms are readable

### Mobile (320px-480px)
- [ ] Header fits on screen
- [ ] Candidates stack vertically
- [ ] Buttons are touch-friendly
- [ ] Forms are scrollable
- [ ] Navigation is accessible

### Dark/Light Mode
- [ ] Colors have good contrast
- [ ] Text is readable
- [ ] Buttons are clear

---

## ✅ Error Handling

### Vote Errors
- [ ] Duplicate vote shows error modal ✓
- [ ] Network errors handled gracefully
- [ ] Confirmation modal has cancel option
- [ ] Submit button shows loading state

### Admin Errors
- [ ] Required field errors show
- [ ] Duplicate position name handled
- [ ] Delete shows confirmation
- [ ] Long operations show loading

### General Errors
- [ ] 404 pages handled
- [ ] Missing images show placeholder
- [ ] API failures show error message
- [ ] User can retry operations

---

## ✅ Performance

### Page Load
- [ ] Home page loads < 3 seconds
- [ ] Admin dashboard loads < 2 seconds
- [ ] Results page loads < 2 seconds
- [ ] No layout shift while loading

### Interactions
- [ ] Vote submission < 1 second
- [ ] Candidate add/edit < 2 seconds
- [ ] Results update within 5 seconds
- [ ] Buttons respond immediately

### Optimization
- [ ] Images are compressed
- [ ] Code is minified in production
- [ ] No console errors
- [ ] Network requests are minimal

---

## 📝 Testing Commands

```bash
# Run development server
npm run dev

# Check for TypeScript errors
npm run typecheck

# Lint code
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

---

## 🎯 Full System Test Scenario

1. **Setup** - Complete SETUP.md
2. **Login** - Test Google OAuth with valid email
3. **Vote** - Cast votes for all positions
4. **Try Duplicate** - Attempt second vote (should error)
5. **Check Dashboard** - Verify vote counts
6. **Add Candidate** - Create new candidate
7. **Vote New** - Vote for new candidate
8. **Check Results** - Verify results update
9. **Export** - Download CSV results
10. **Admin Check** - Verify non-admin cannot access

---

**Total Features**: 50+ ✓
**Estimated Test Time**: 30 minutes
**Status**: Ready for production testing
