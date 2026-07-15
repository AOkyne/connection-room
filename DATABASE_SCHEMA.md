# The Connection Room - Database Schema

## Overview
PostgreSQL database hosted on Supabase with Row Level Security (RLS) for privacy and data protection.

---

## Tables

### 1. `auth.users`
**Managed by Supabase Auth** - Not directly modified by app

```sql
id: UUID (Primary Key)
email: STRING
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

---

### 2. `public.profiles`
**User profile information and preferences**

```sql
id: TEXT (Primary Key) - References auth.users.id
display_name: TEXT - User's chosen name
pronouns: TEXT - Optional (e.g., "he/him", "they/them")
location: TEXT - Optional city/location
age_range: TEXT - Optional
relationship_status: TEXT - Optional
orientation: TEXT - Optional
profile_photo: TEXT - URL to profile image (SVG or uploaded)
member_type: TEXT - 'individual', 'partnered-individual', or 'couple'
what_brought_you_here: TEXT - Open-ended intro
connection_hoping: TEXT - What they seek in community
interests: TEXT[] - Array of interest tags
pairing_comfort_level: TEXT - Optional comfort level
pairing_boundaries: TEXT - Optional boundaries
quiz_result: TEXT - Latest quiz result
first_prompt_response: TEXT - First response to daily prompt
first_prompt_is_public: BOOLEAN - Whether to share response
completed_onboarding: BOOLEAN - Onboarding completion flag
spaces_joined: TEXT[] - Array of space IDs user has joined
joined_at: TIMESTAMP - Account creation date
```

**RLS Policies (as of migration 039 — see [`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md)):**
- SELECT: owner only (`user_id = auth.uid()`), or caller is an admin
- INSERT/UPDATE: owner only
- UPDATE (admin): caller is an admin
- No other member can read another member's row here — see `public_profiles` below

---

### 2a. `public.public_profiles`
**Safe, cross-member-readable subset of profile data** (added in migration 039)

```sql
user_id: UUID (Primary Key) - References auth.users.id
display_name: TEXT
profile_photo: TEXT
tagline: TEXT
pronouns: TEXT
location: TEXT
interests: JSONB
spaces_joined: JSONB
is_seeded: BOOLEAN
profile_visibility: TEXT - hidden | members_only | shared_spaces | member_discovery
show_in_discovery: BOOLEAN
show_general_location: BOOLEAN
show_interests: BOOLEAN
show_recent_posts: BOOLEAN
show_pronouns: BOOLEAN
```

Kept in sync with `profiles` automatically via the `profiles_sync_public`
trigger. Application code reads `public_profiles_view` (a column-masking
view over this table), not this table directly, for any cross-member
display. Full detail in [`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md).

---

### 3. `public.spaces`
**Community discussion spaces**

```sql
id: TEXT (Primary Key) - 'commons', 'start-here', 'embodiment', etc.
name: TEXT - Display name
description: TEXT - Full description
icon: TEXT - Icon identifier (used with SpaceIconSVG)
color: TEXT - Tailwind color class (for styling)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

**Pre-seeded Spaces:**
1. commons - The Commons
2. start-here - Start Here (onboarding)
3. intimacy-patterns - Intimacy Patterns
4. touch-affection - Touch & Affection
5. spirituality-sexuality - Spirituality, Sexuality & Integration
6. dating-desire - Dating, Desire & Vulnerability
7. couples - Couples, Closeness & Repair
8. embodiment - Embodiment Practice
9. workshops - Workshops & Retreats
10. masculinity-sex-sexuality - Masculinity, Sex, and Sexuality
11. sacred-sexuality - Sacred Sexuality Practices

---

### 4. `public.space_memberships`
**Tracks which users have joined which spaces**

```sql
id: UUID (Primary Key)
user_id: TEXT (Foreign Key → profiles.id)
space_id: TEXT (Foreign Key → spaces.id)
joined_at: TIMESTAMP
created_at: TIMESTAMP
```

**Unique Constraint:** (user_id, space_id) - One record per user per space

**RLS Policies:**
- SELECT: All authenticated users can see all memberships
- INSERT: Users can only add themselves
- DELETE: Users can only remove themselves

---

### 5. `public.posts`
**Discussion posts in spaces**

```sql
id: TEXT (Primary Key) - 'post-{timestamp}'
space_id: TEXT (Foreign Key → spaces.id)
user_id: TEXT (Foreign Key → profiles.id)
content: TEXT - Post body text
is_prompt_response: BOOLEAN - Whether response to daily prompt
prompt_id: TEXT - Optional reference to prompt
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

**RLS Policies:**
- SELECT: Members of the space can read posts
- INSERT: Authenticated users can create posts in joined spaces
- UPDATE: Users can only update their own posts
- DELETE: Users can only delete their own posts

---

### 6. `public.comments`
**Comments on posts**

```sql
id: TEXT (Primary Key) - 'comment-{timestamp}'
post_id: TEXT (Foreign Key → posts.id)
user_id: TEXT (Foreign Key → profiles.id)
content: TEXT - Comment body text
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

**RLS Policies:**
- SELECT: Visible to space members
- INSERT: Space members can comment
- UPDATE: Users can only update own comments
- DELETE: Users can only delete own comments

---

### 7. `public.reactions`
**Emoji reactions to posts and comments**

```sql
id: UUID (Primary Key)
post_id: TEXT (Foreign Key → posts.id) - Nullable
comment_id: TEXT (Foreign Key → comments.id) - Nullable
user_id: TEXT (Foreign Key → profiles.id)
reaction_type: TEXT - Emoji or reaction name
created_at: TIMESTAMP
```

**RLS Policies:**
- SELECT: Space members can see reactions
- INSERT: Authenticated users can add reactions
- DELETE: Users can remove their own reactions

---

### 8. `public.reports`
**User reports of inappropriate content** (Setup only, not yet used)

```sql
id: UUID (Primary Key)
reporter_id: TEXT (Foreign Key → profiles.id)
reported_user_id: TEXT (Foreign Key → profiles.id) - Optional
post_id: TEXT (Foreign Key → posts.id) - Optional
reason: TEXT - Reason for report
details: TEXT - Additional details
status: TEXT - 'pending', 'reviewed', 'resolved'
created_at: TIMESTAMP
```

---

### 9. `public.couples_profiles`
**Extended profiles for couples** (Setup only, not yet used)

```sql
id: UUID (Primary Key)
user_id: TEXT (Foreign Key → profiles.id) - Primary couple member
couple_display_name: TEXT - Name for the couple
partner2_name: TEXT - Name of second partner
partner2_email: TEXT - Email of second partner
relationship_length: TEXT - How long together
relationship_structure: TEXT - Open, closed, etc.
couple_goals: TEXT[] - Goals for the relationship
couples_boundaries: TEXT - Shared boundaries
created_at: TIMESTAMP
```

---

## Data Relationships

```
auth.users (Supabase managed)
    ↓
    ├─→ profiles (one user, one profile)
    │       ↓
    │       ├─→ space_memberships (many to many)
    │       │       ↓
    │       │       ├─→ spaces
    │       │       ├─→ posts (user created)
    │       │       └─→ comments (user created)
    │       │
    │       └─→ couples_profiles (optional)
    │
    └─→ posts (user authored)
            ↓
            ├─→ comments
            │   ↓
            │   └─→ reactions
            │
            └─→ reactions
```

---

## Indexes for Performance

```sql
-- Improve query speed
CREATE INDEX idx_posts_space_id ON posts(space_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_reactions_post_id ON reactions(post_id);
CREATE INDEX idx_space_memberships_user_id ON space_memberships(user_id);
CREATE INDEX idx_space_memberships_space_id ON space_memberships(space_id);
```

---

## Key Design Decisions

### 1. TEXT Primary Keys
- Used for user_id, space_id, post_id (not UUID)
- Allows human-readable IDs ('commons', 'post-123456')
- Demo mode compatibility (localStorage keys)

### 2. Array Types (TEXT[])
- `profiles.interests` - Array of interest tags
- `profiles.spaces_joined` - Array of space IDs
- Denormalized for performance (less joins)

### 3. Nullable Fields
- Most profile fields are optional
- Allows gradual profile completion

### 4. Timestamps
- `created_at` - When record was created
- `updated_at` - When last modified
- Automatic via Supabase triggers

### 5. Row Level Security (RLS)
- All tables have RLS enabled
- Policies defined per operation (SELECT, INSERT, UPDATE, DELETE)
- Users see only data they have access to
- Admins can bypass RLS

---

## Demo Mode (localStorage)

When not authenticated, app uses browser localStorage with this structure:

```javascript
// Posts
localStorage.setItem('connection-room:posts', JSON.stringify([
  {
    id: 'post-1',
    spaceId: 'commons',
    userId: 'user-marcus',
    authorName: 'Marcus',
    content: '...',
    createdAt: new Date(),
    reactions: {},
    commentCount: 2
  }
]))

// Spaces
localStorage.setItem('connection-room:spaces', JSON.stringify([
  {
    id: 'commons',
    name: 'The Commons',
    description: '...',
    icon: 'commons',
    memberCount: 247,
    isJoined: true
  }
])

// User Profile
localStorage.setItem('connection-room:profile', JSON.stringify({
  id: 'user-demo',
  displayName: 'Demo Member',
  pronouns: 'they/them',
  // ... other fields
}))
```

---

## Migrations

All schema changes tracked in `supabase/migrations/`:

1. `001_beta_schema.sql` - Initial schema (tables, RLS)
2. `002_seed_example_content.sql` - Demo posts and comments
3. `003_add_reactions_policies.sql` - Reaction RLS policies
4. `004_add_new_spaces.sql` - New community spaces

---

## Future Considerations

### To Add
- Events table (for workshop/retreat management)
- Messages table (for direct messaging)
- Notifications table (for engagement alerts)
- Audit logs table (for moderation)
- Feature flags table (for A/B testing)

### Performance Optimizations
- Full-text search indexes on posts/comments
- Materialized views for analytics
- Connection pooling via Supabase
- Query optimization for large result sets

### Security Enhancements
- Encryption for sensitive profile fields
- API rate limiting
- DDoS protection
- Audit logging
