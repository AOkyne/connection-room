# Row Level Security (RLS) Policies for Connection Room

This document outlines the recommended RLS policies for each table in the Supabase database. These policies ensure users can only access the data they're allowed to see and modify.

## Implementation Steps

For each table:
1. Enable RLS in Supabase (Authentication → Policies → Enable RLS)
2. Copy the SQL policy below
3. Create the policy in Supabase Console

## Table Policies

### 1. **public.profiles**

**Purpose**: User profile information

**Access Rules**:
- All authenticated users can read any profile (public)
- Users can only edit their own profile
- Public unauthenticated users can read profiles (for member discovery)

```sql
-- Enable authenticated users to read all profiles
CREATE POLICY "Profiles are readable by all"
ON public.profiles FOR SELECT
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);
```

---

### 2. **public.spaces**

**Purpose**: Community spaces

**Access Rules**:
- All authenticated users can read all spaces
- Only admins can create/update/delete spaces
- Spaces are discoverable by all members

```sql
-- All authenticated users can read spaces
CREATE POLICY "Spaces are readable by all authenticated users"
ON public.spaces FOR SELECT
USING (auth.role() = 'authenticated');

-- Only admins can insert spaces
CREATE POLICY "Only admins can create spaces"
ON public.spaces FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));

-- Only admins can update spaces
CREATE POLICY "Only admins can update spaces"
ON public.spaces FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));

-- Only admins can delete spaces
CREATE POLICY "Only admins can delete spaces"
ON public.spaces FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));
```

---

### 3. **public.space_members**

**Purpose**: Track which users are members of which spaces

**Access Rules**:
- Users can see which spaces they're in
- Admins can see all space memberships
- Users can join spaces (insert)
- Users can leave spaces (delete their own membership)

```sql
-- Users can see their own memberships
CREATE POLICY "Users can see their own space memberships"
ON public.space_members FOR SELECT
USING (user_id = auth.uid());

-- Admins can see all memberships
CREATE POLICY "Admins can see all space memberships"
ON public.space_members FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));

-- Users can join spaces (insert their own membership)
CREATE POLICY "Users can join spaces"
ON public.space_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can leave spaces (delete their own membership)
CREATE POLICY "Users can leave spaces"
ON public.space_members FOR DELETE
USING (user_id = auth.uid());
```

---

### 4. **public.posts**

**Purpose**: Posts made in spaces

**Access Rules**:
- Users can read posts from spaces they're members of
- Admins can read all posts
- Users can create posts in spaces they've joined
- Users can only edit/delete their own posts

```sql
-- Users can read posts from spaces they're in
CREATE POLICY "Users can read posts from their spaces"
ON public.posts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_id = posts.space_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND type = 'admin'
  )
);

-- Users can create posts in spaces they've joined
CREATE POLICY "Users can create posts in their spaces"
ON public.posts FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_id = posts.space_id AND user_id = auth.uid()
  )
);

-- Users can only update their own posts
CREATE POLICY "Users can only update their own posts"
ON public.posts FOR UPDATE
USING (user_id = auth.uid());

-- Users can only delete their own posts
CREATE POLICY "Users can only delete their own posts"
ON public.posts FOR DELETE
USING (user_id = auth.uid());
```

---

### 5. **public.comments**

**Purpose**: Comments on posts

**Access Rules**:
- Users can read comments on posts they can access
- Users can create comments on posts in their spaces
- Users can only edit/delete their own comments

```sql
-- Users can read comments on posts they have access to
CREATE POLICY "Users can read comments on accessible posts"
ON public.comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts
    WHERE id = comments.post_id
    AND (
      EXISTS (
        SELECT 1 FROM public.space_members
        WHERE space_id = posts.space_id AND user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND type = 'admin'
      )
    )
  )
);

-- Users can create comments on accessible posts
CREATE POLICY "Users can create comments on accessible posts"
ON public.comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.posts
    WHERE id = comments.post_id
    AND EXISTS (
      SELECT 1 FROM public.space_members
      WHERE space_id = posts.space_id AND user_id = auth.uid()
    )
  )
);

-- Users can only update their own comments
CREATE POLICY "Users can only update their own comments"
ON public.comments FOR UPDATE
USING (user_id = auth.uid());

-- Users can only delete their own comments
CREATE POLICY "Users can only delete their own comments"
ON public.comments FOR DELETE
USING (user_id = auth.uid());
```

---

### 6. **public.connections** (formerly pairings)

**Purpose**: Track user connections

**Access Rules**:
- Users can see their own connections
- Admins can see all connections

```sql
-- Users can see their own connections
CREATE POLICY "Users can see their own connections"
ON public.connections FOR SELECT
USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

-- Admins can see all connections
CREATE POLICY "Admins can see all connections"
ON public.connections FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));

-- Users can create connections (system managed)
CREATE POLICY "Users can create their own connections"
ON public.connections FOR INSERT
WITH CHECK (user_id_1 = auth.uid());

-- Only admins can update connections
CREATE POLICY "Only admins can update connections"
ON public.connections FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));

-- Users can delete their own connections
CREATE POLICY "Users can delete their own connections"
ON public.connections FOR DELETE
USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid());
```

---

### 7. **public.connection_preferences**

**Purpose**: User preferences for connections

**Access Rules**:
- Users can read their own preferences
- Users can update their own preferences
- Admins can read all preferences

```sql
-- Users can read their own preferences
CREATE POLICY "Users can read their own connection preferences"
ON public.connection_preferences FOR SELECT
USING (user_id = auth.uid());

-- Admins can read all preferences
CREATE POLICY "Admins can read all connection preferences"
ON public.connection_preferences FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own connection preferences"
ON public.connection_preferences FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update their own connection preferences"
ON public.connection_preferences FOR UPDATE
USING (user_id = auth.uid());
```

---

### 8. **public.badges**

**Purpose**: Badge definitions (system-wide)

**Access Rules**:
- All users can read badge definitions
- Only admins can create/modify/delete badges

```sql
-- All authenticated users can read badges
CREATE POLICY "Badges are readable by all"
ON public.badges FOR SELECT
USING (auth.role() = 'authenticated');

-- Only admins can insert badges
CREATE POLICY "Only admins can create badges"
ON public.badges FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));

-- Only admins can update badges
CREATE POLICY "Only admins can update badges"
ON public.badges FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));

-- Only admins can delete badges
CREATE POLICY "Only admins can delete badges"
ON public.badges FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));
```

---

### 9. **public.user_badges**

**Purpose**: Badges earned by users

**Access Rules**:
- Users can see their own badges
- Admins can see all user badges
- Only admins can award badges

```sql
-- Users can see their own badges
CREATE POLICY "Users can see their own badges"
ON public.user_badges FOR SELECT
USING (user_id = auth.uid());

-- Admins can see all user badges
CREATE POLICY "Admins can see all user badges"
ON public.user_badges FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));

-- Only admins can award badges
CREATE POLICY "Only admins can award badges"
ON public.user_badges FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));

-- Only admins can update badges
CREATE POLICY "Only admins can update badge records"
ON public.user_badges FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));
```

---

### 10. **public.events**

**Purpose**: Events and workshops

**Access Rules**:
- All users can read events
- Only admins can create/modify/delete events

```sql
-- All authenticated users can read events
CREATE POLICY "Events are readable by all"
ON public.events FOR SELECT
USING (auth.role() = 'authenticated');

-- Only admins can insert events
CREATE POLICY "Only admins can create events"
ON public.events FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));

-- Only admins can update events
CREATE POLICY "Only admins can update events"
ON public.events FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));

-- Only admins can delete events
CREATE POLICY "Only admins can delete events"
ON public.events FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));
```

---

### 11. **public.event_interests**

**Purpose**: User interest in events

**Access Rules**:
- Users can see their own interests
- Admins can see all interests
- Users can create/delete their own interests

```sql
-- Users can see their own event interests
CREATE POLICY "Users can see their own event interests"
ON public.event_interests FOR SELECT
USING (user_id = auth.uid());

-- Admins can see all event interests
CREATE POLICY "Admins can see all event interests"
ON public.event_interests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND type = 'admin'
));

-- Users can create their own interests
CREATE POLICY "Users can create their own event interests"
ON public.event_interests FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can delete their own interests
CREATE POLICY "Users can delete their own event interests"
ON public.event_interests FOR DELETE
USING (user_id = auth.uid());
```

---

## Summary

These policies follow the principle of **least privilege**:

- **Public data** (badges, events, spaces): Anyone can read
- **Personal data** (profiles, preferences, badges earned): Only the user and admins
- **Space-scoped data** (posts, comments): Users in that space can read; creator can modify
- **Admin functions**: Only admin users can create, update, or delete system data

## Testing Your Policies

After implementing these policies, test them:

1. Create a test user account
2. Try to read/write various tables
3. Verify that users can only access their own data
4. Verify that admins can access all data

## Notes

- These policies assume you have an `admin` value in the `type` column of the `profiles` table
- Adjust the column names if your schema differs
- Some policies check for admin status via `EXISTS` subqueries — ensure the `profiles` table is properly accessible
- Test thoroughly before deploying to production
