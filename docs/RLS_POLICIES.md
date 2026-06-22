# Row Level Security (RLS) Policies for Member Profiles

This document describes the RLS policies required for the "People in the Room" feature.

## Overview

Member profiles are protected by RLS policies that enforce:
- Authenticated users can view profiles of members in shared spaces
- Visibility settings are respected
- Demo profiles cannot log in or perform authenticated actions
- Sensitive data is protected from unauthorized access

## Policies

### 1. Profile View Access

**Policy Name:** `profiles_authenticated_view`

Authenticated users can view profiles based on:
- Shared space membership
- Profile visibility settings
- Whether the profile is a demo profile

```sql
CREATE POLICY "profiles_authenticated_view"
ON profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Can view own profile
    auth.uid() = id OR
    -- Can view profiles of members in shared spaces
    id IN (
      SELECT sm.user_id FROM space_members sm
      WHERE sm.space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    ) OR
    -- Can view based on profile visibility
    (profile_visibility = 'all_authenticated_members' AND NOT is_demo_profile)
  )
);
```

### 2. Profile Update Access

**Policy Name:** `profiles_user_update`

Users can only update their own profile.

```sql
CREATE POLICY "profiles_user_update"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Prevent demo profiles from being modified
  NOT is_demo_profile
);
```

### 3. Profile Insert Access

**Policy Name:** `profiles_user_insert`

Users can only insert their own profile during authentication.

```sql
CREATE POLICY "profiles_user_insert"
ON profiles
FOR INSERT
WITH CHECK (
  auth.uid() = id AND
  NOT is_demo_profile
);
```

### 4. Demo Profile Protection

**Policy Name:** `profiles_demo_readonly`

Demo profiles cannot be deleted or have ownership transferred.

```sql
CREATE POLICY "profiles_demo_readonly"
ON profiles
FOR DELETE
USING (auth.uid() = id AND NOT is_demo_profile);
```

### 5. Space Members View Access

**Policy Name:** `space_members_view`

Authenticated users can view space memberships for spaces they're in.

```sql
CREATE POLICY "space_members_view"
ON space_members
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Can view members in spaces they joined
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    ) OR
    -- Public members view (if space is public)
    space_id IN (
      SELECT id FROM spaces WHERE is_public = true
    )
  )
);
```

## Implementation Steps

1. Connect to your Supabase project
2. Go to the SQL Editor
3. Run each policy SQL statement
4. Verify policies are active in the Authentication > Policies section

## Testing

After implementing RLS policies, test the following scenarios:

1. **Authenticated user viewing shared space member:**
   - ✓ Should see full profile if in same space
   - ✓ Should see partial profile if visibility is limited

2. **Unauthenticated user:**
   - ✓ Should NOT be able to view any profiles

3. **Demo profile access:**
   - ✓ Should be visible only to members in shared spaces
   - ✓ Should NOT allow login or authentication

4. **Profile visibility settings:**
   - ✓ "space_members" - visible only to members in shared spaces
   - ✓ "all_authenticated_members" - visible to all authenticated users
   - ✓ "limited" - shows only name and photo

## Privacy Considerations

- Email addresses are never exposed in profiles
- Phone numbers and private contact info are excluded
- Admin fields are protected from view
- Demo profiles are clearly marked and restricted
- Post history is controlled by `show_recent_posts` setting
- Location visibility is controlled by `show_general_location` setting

## Future Enhancements

- Blocking/hiding members
- Profile view notifications
- More granular visibility controls
- Activity-based access restrictions
