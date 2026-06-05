# Architecture & Technical Documentation

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js + React)              │
├─────────────────────────────────────────────────────────────┤
│  Pages          Components        State Management            │
│  ├── /           ├── auth-provider  ├── Auth Context         │
│  ├── /login      ├── admin-layout   ├── Form State           │
│  ├── /auth/cb    ├── error-modal    └── UI State             │
│  ├── /admin      ├── vote-modals    
│  ├── /admin/c    └── candidate-card 
│  └── /admin/r                      
└──────────────────────────────────────────────────────────────┘
                              ↓
                    Supabase Client
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                   Supabase Backend                            │
├──────────────────────────────────────────────────────────────┤
│  Authentication   Database     Policies       Triggers        │
│  ├── Google OAuth ├── admins   ├── RLS        ├── vote_count  │
│  └── Sessions     ├── cand.    ├── SELECT     └── cascade     │
│                   ├── votes    └── INSERT/UPD              │
└──────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### Vote Submission Flow
```
User Clicks Vote
    ↓
Vote Confirmation Modal Opens
    ↓
User Confirms
    ↓
POST /api (via Supabase client)
    ↓
Check: voter_id + position unique?
    ↓
Yes: Insert vote → Trigger increments vote_count
    ↓
Vote Success Modal
    ↓
Refresh candidate list & stats
```

### Admin Candidate Management Flow
```
Admin Panel → Add/Edit/Delete
    ↓
Validate form (required fields)
    ↓
Check admin permission (RLS)
    ↓
INSERT/UPDATE/DELETE
    ↓
Success message
    ↓
Refresh candidate list
```

## 📊 Database Relationships

```
auth.users
    ├── PK: id
    └── 1:M → admins
            └── PK: id
                FK: user_id

candidates
    ├── PK: id
    ├── position: text
    ├── vote_count: integer (cached)
    └── 1:M → votes
            └── candidate_id (FK)

votes
    ├── PK: id
    ├── FK: voter_id (auth.users)
    ├── FK: candidate_id (candidates)
    ├── position: text
    └── UNIQUE(voter_id, position)
```

## 🔐 Row Level Security (RLS) Policies

### admins table
```sql
-- Admins can read their own admin record
SELECT: auth.uid() = user_id
```

### candidates table
```sql
-- Everyone authenticated can read candidates
SELECT: true

-- Only admins can insert
INSERT: EXISTS(SELECT 1 FROM admins WHERE user_id = auth.uid())

-- Only admins can update
UPDATE: EXISTS(SELECT 1 FROM admins WHERE user_id = auth.uid())
```

### votes table
```sql
-- Users can insert their own vote
INSERT: auth.uid() = voter_id

-- Users can read their own votes
SELECT: auth.uid() = voter_id

-- Admins can read all votes
SELECT: EXISTS(SELECT 1 FROM admins WHERE user_id = auth.uid())
```

## 🔗 API Reference

### Authentication

**Sign In (OAuth)**
```typescript
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'http://localhost:3000/auth/callback',
    queryParams: { hd: 'cmr.ac.in' }
  }
})
```

**Sign Out**
```typescript
supabase.auth.signOut()
```

**Get Session**
```typescript
supabase.auth.getSession()
```

### Candidates

**Get All Candidates**
```typescript
supabase
  .from('candidates')
  .select('id,name,position,image_url,department')
  .order('position')
  .order('name')
```

**Add Candidate** (Admin only)
```typescript
supabase.from('candidates').insert({
  name: string,
  position: string,
  department: string,
  year: string,
  bio: string,
  photo_url: string,
  manifesto: string
})
```

**Update Candidate** (Admin only)
```typescript
supabase
  .from('candidates')
  .update({ ... })
  .eq('id', candidateId)
```

**Delete Candidate** (Admin only)
```typescript
supabase
  .from('candidates')
  .delete()
  .eq('id', candidateId)
```

### Votes

**Submit Vote**
```typescript
supabase.from('votes').insert({
  voter_id: user.id,
  voter_email: user.email,
  candidate_id: candidateId,
  position: position
})
// Error code 23505: UNIQUE constraint violation
```

**Get User's Votes**
```typescript
supabase
  .from('votes')
  .select('id,name,position,image_url,department')
  .eq('voter_id', user.id)
```

**Get All Votes** (Admin only)
```typescript
supabase
  .from('votes')
  .select('id,name,position,image_url,department')
```

### Admins

**Get Admin Status**
```typescript
supabase
  .from('admins')
  .select('id')
  .eq('user_id', userId)
  .maybeSingle()
```

**Add Admin** (Database direct)
```sql
INSERT INTO admins (user_id, email) 
VALUES ('uuid', 'email@cmr.ac.in')
```

## 🔄 Realtime Subscriptions (Optional Enhancement)

Currently the system uses polling (5-second refresh). To enable Realtime:

```typescript
// Subscribe to vote changes
const subscription = supabase
  .from('votes')
  .on('*', payload => {
    console.log('Vote update:', payload)
    // Refresh UI
  })
  .subscribe()
```

## 📦 Component API

### AuthProvider
```typescript
type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const { user, loading, isAdmin, signInWithGoogle, signOut } = useAuth()
```

### AdminLayout
```typescript
<AdminLayout activePage="dashboard" | "candidates" | "results">
  {children}
</AdminLayout>
```

### CandidateCard
```typescript
<CandidateCard
  candidate={Candidate}
  hasVoted={boolean}
  isVotedFor={boolean}
  position={string}
  onVote={(candidate: Candidate) => void}
/>
```

### VoteConfirmModal
```typescript
<VoteConfirmModal
  candidate={Candidate}
  onConfirm={() => void}
  onCancel={() => void}
  loading={boolean}
/>
```

### VoteSuccessModal
```typescript
<VoteSuccessModal
  candidate={Candidate}
  onDismiss={() => void}
/>
```

### ErrorModal
```typescript
<ErrorModal
  title={string}
  message={string}
  onDismiss={() => void}
/>
```

## 🗄️ Database Triggers

### vote_count Trigger
```sql
CREATE TRIGGER on_vote_insert
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION increment_vote_count()
```

**Function**:
```sql
CREATE FUNCTION increment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE candidates
  SET vote_count = vote_count + 1
  WHERE id = NEW.candidate_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
```

**Effect**: vote_count auto-increments when vote is inserted

## 🚀 Performance Optimization

### Query Optimization
- Indexed queries on `voter_id`, `candidate_id`, `position`
- Vote count cached to avoid aggregation
- RLS policies minimize data exposure

### Frontend Optimization
- Next.js Image component for compressed images
- React.memo for expensive components
- Debounced search/filter operations
- Lazy loading for admin tables

### Caching Strategy
- Client-side state caching (React Context)
- Polling-based updates (5-second refresh)
- Optional Realtime for instant updates

## 🔒 Security Features

### Authentication
- OAuth 2.0 via Google
- Session tokens in secure HTTP-only cookies
- Automatic token refresh

### Authorization
- RLS policies at database level
- Admin role verification on sensitive operations
- Domain restriction to @cmr.ac.in

### Data Protection
- All votes encrypted in transit (HTTPS)
- One-vote-per-position UNIQUE constraint
- Vote history immutable (no delete votes)

### Input Validation
- Form validation on frontend
- Type checking via TypeScript
- Server-side RLS validation

## 📈 Scalability

### Current Limits
- Supabase free tier: 500,000 database calls/month
- Suitable for colleges up to 5,000 students
- Vote processing: O(1) per vote (no aggregation)

### Scale Improvements
- Denormalized vote_count column (no recalculation)
- Indexed queries
- Optional vote counting caching layer

## 🔧 Customization Points

1. **Change positions** - Modify candidates in admin panel
2. **Customize fields** - Update schema + form
3. **Change polling interval** - Edit refresh timers
4. **Add more admins** - Insert into admins table
5. **Modify styling** - Update Tailwind config
6. **Add notifications** - Integrate email/SMS

## 📝 Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=<supabase_project_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase_anon_key>

# Optional (for advanced features)
NEXT_PUBLIC_SENTRY_DSN=<error_tracking>
```

## 🐛 Error Handling

### Vote Errors
- 23505: UNIQUE constraint violation → "Already voted"
- 403: RLS policy violation → User not authenticated
- Connection timeout → "Network error" + retry

### Admin Errors
- Missing required fields → Form validation
- RLS policy violation → "Access denied"
- Foreign key violation → Cascading delete

## 📊 Monitoring

### Key Metrics
- Vote submission success rate
- Average response time
- Database query performance
- Error rate and types

### Supabase Monitoring
1. Dashboard > Logs
2. Dashboard > Statistics
3. Dashboard > Performance
4. Auth logs for login attempts

---

**Last Updated**: June 2, 2026
**Maintainer**: College Admin
