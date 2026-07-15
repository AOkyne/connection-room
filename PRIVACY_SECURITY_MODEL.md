# Privacy & Security Model

This document describes how member profile data is protected as of migration
`039_profile_privacy_overhaul.sql`. It supersedes the profile-related
sections of `RLS_POLICIES.md`, which described the pre-launch, never-locked-
down model and is now stale.

## Status

**As of this writing, migration 039 has been written but not yet applied to
production.** Migrations 036, 037, and 038 (created earlier in the same
project) had also not been confirmed applied as of the start of this work.
Until all four are run against production, in order, the pre-migration state
described in "What this replaces" below is still live. See
`PRODUCTION_MIGRATION_STATUS` in the final report delivered alongside this
document for the exact SQL to run and verify.

## What this replaces

Since migration 001, `profiles` carried the policy:

```sql
CREATE POLICY "Profiles are readable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (TRUE);
```

Any signed-in member could `SELECT *` on any other member's row. This
included `orientation`, `relationship_status`, `connection_comfort_level`,
`connection_boundaries`, `quiz_result`, and `first_prompt_response`. Three
real application code paths actively fetched and, in some cases, directly
rendered this data: the member profile page (`/members/[id]`, which had no
authentication guard at all), the connection-matching algorithm (client-side,
shipping full profile rows to the browser), and the space member list.

## The two-table model

### `profiles` (private)

Owner- and admin-only. Holds every field, including the sensitive ones
listed above. RLS:

- **SELECT**: `user_id = auth.uid()`, or caller's own profile has
  `role = 'admin'`.
- **INSERT/UPDATE**: `user_id = auth.uid()` (unchanged from migration 001).
- **UPDATE (admin)**: caller's own profile has `role = 'admin'`.
- **Anonymous**: no policy grants access; RLS defaults to deny.

### `public_profiles` (public-safe subset)

Holds only what another member is allowed to see: `display_name`,
`profile_photo`, `tagline`, `pronouns`, `location`, `interests`,
`spaces_joined`, `is_seeded`, plus visibility settings. Kept in sync with
`profiles` automatically by a trigger (`sync_public_profile`) that fires on
every `profiles` INSERT/UPDATE — no application write path needs to
remember to write to both tables.

RLS:

- **Owner**: full SELECT/INSERT/UPDATE of their own row.
- **Admin**: SELECT/UPDATE any row.
- **Other authenticated members**: SELECT rows where `profile_visibility` is
  `members_only` or `member_discovery`, or `shared_spaces` and the caller
  shares at least one space with the row's owner (checked via
  `space_memberships`). Rows with `profile_visibility = 'hidden'` are not
  matched by this policy and are therefore invisible to anyone but the
  owner/admin.
- **Anonymous**: no access.

### `public_profiles_view` (column-level masking)

A thin view over `public_profiles` that nulls individual columns per the
owner's own flags (`show_pronouns`, `show_general_location`,
`show_interests`). This exists because RLS is row-level only — it cannot
express "hide this one column for this one row." The view carries no
`SECURITY DEFINER`, so it runs with the querying user's own RLS permissions
on `public_profiles`; it only masks columns, it grants no additional row
access beyond what `public_profiles`' own policies already allow.

**All application code that reads another member's profile must query
`public_profiles_view`, never `public_profiles` or `profiles` directly**
(except a user's own row, or an admin acting through the private table for
legitimate moderation).

### Why a table for the private/public split, and a view for column masking

A view over `profiles` could not withhold individual private columns from a
member who can see the row at all, short of hand-listing every safe column
— and any new private field added to `profiles` later would leak through
such a view by default unless someone remembered to exclude it. A real
table with an explicit, minimal column list fails safe instead: new private
fields are invisible to `public_profiles` until someone deliberately mirrors
them into the sync trigger.

Per-field visibility toggling (pronouns/location/interests) is a different,
narrower problem that a view handles safely, because it sits on top of a
table that is already row-restricted by RLS — the view can only ever narrow
what a caller sees, never widen it.

## Field visibility rules

| Field | Default | Owner can hide? |
|---|---|---|
| `pronouns` | shown | `show_pronouns` |
| `location` (general) | **hidden** | `show_general_location` |
| `interests` | shown | `show_interests` |
| recent posts (app-layer, not a column) | hidden | `show_recent_posts` |
| discovery inclusion | shown | `show_in_discovery` |

Row-level visibility (`profile_visibility`): `hidden` (owner/admin only),
`members_only`, `shared_spaces` (visible to members who share a space),
`member_discovery`. `members_only` and `member_discovery` currently resolve
identically (any authenticated member) — kept as separate states because a
future release may want discovery-surfaced profiles to differ from
directly-linkable ones, but no such distinction is implemented yet.

`orientation` and `relationship_status` are **not** in `public_profiles` at
all in this release — they remain fully private, with no opt-in sharing
path yet. A later release may add field-level preferences for these two
specifically, per product direction, but that is not built now.

## Application refactor

Cross-member reads were moved off `profiles` to `public_profiles_view`
(via new `getPublicProfile()` / `getPublicProfilesBySpace()` helpers in
`lib/data/profiles.ts`) in:

- `app/members/[id]/page.tsx` — also gained an authentication guard it
  previously lacked entirely (any unauthenticated visitor could load it).
- `app/app/users/[userId]/page.tsx` — orphaned duplicate, fixed anyway.
- `app/app/spaces/[id]/members/page.tsx` (space member list).
- `components/connections/ConnectionProfileModal.tsx` — stripped direct
  rendering of `ageRange`, `relationshipStatus`, `orientation`,
  `whatBroughtYouHere`, `connectionHoping`, `connectionComfortLevel`,
  `connectionBoundaries`, all previously rendered for any suggested match a
  member clicked "View Profile" on, before any connection was made.

Connection matching (`lib/matching.ts`) moved from a client-side function
that fetched every other member's complete row, to a thin client wrapping a
new server route (`app/api/matching/find/route.ts`). The route runs with
the service-role key (needed because scoring legitimately uses
`relationship_status`/`age_range`/`location` for compatibility), but only
ever returns a safe field subset — the private fields used for scoring
never reach the browser.

The invited-friends list (`lib/data/invites.ts`'s `getInvitedFriends()`)
had the same problem one level removed: `invite_relationships` keys off
`profiles.id` (the internal row PK), which an ordinary member can no longer
resolve to another member's name/photo now that `profiles` is locked down.
Moved to a new server route (`app/api/invites/friends/route.ts`) for the
same reason as matching.

`posts`/`comments` needed no change: both already denormalize
`author_name`/`author_pronouns`/`author_photo` onto the row at write time
(verified via `lib/data/supabase-posts.ts`), so rendering an author's name
on a post or comment never queries `profiles` for another user.

`app/app/admin/members/page.tsx` and `app/app/admin/members/[id]/page.tsx`
continue to use the full `profiles` table via `getAllProfiles()` /
`getProfilesBySpace()` — both are gated by a `session.type !== "admin"`
guard, and the new `profiles_admin_select` RLS policy grants admins genuine
row access at the database level too (previously, admin RLS checks existed
in name only — see "Known limitations" below).

`components/community/CommunityMembersGrid.tsx` was not touched: it
currently renders a hardcoded demo seed array, not live Supabase data. Not
a privacy issue, but also not showing real members — a separate,
pre-existing functionality gap, not introduced or fixed by this work.

## Demo mode

Investigated whether a demo/preview visitor could reach production
Supabase data. Findings:

- `app/preview/` is an empty directory; the route 404s in production.
- The landing page's CTAs ("Step Inside") link to `/auth?mode=member`, not
  a demo bypass.
- `app/app/layout.tsx` (the layout wrapping all `/app/*` routes) redirects
  to `/auth` when neither a stored session nor `getSession()` resolves to a
  signed-in user. There is no guest/demo fallback at this layer.
- `isDemoMode()` is environment-based (`isSupabaseConfigured`), not a
  runtime toggle — but since there is no live entry point that reaches the
  app without authentication, this does not currently constitute a way for
  an anonymous visitor to write to production data.

**Conclusion: no live demo entry point exists in the current production
build.** A centralized runtime demo-session guard was not implemented,
since there is nothing for it to guard against right now. If a `/preview`
or guest-mode route is added later, this conclusion must be re-verified —
do not assume the current safety holds after that kind of change.

## Known limitations

- **Pre-existing broken admin RLS policies outside this migration's scope.**
  Migration 012 (`012_admin_dashboard_launch.sql`) wrote 15 admin policies
  across `offers`, `events`, `event_registrations`, and `activity_logs`
  using `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role =
  'admin')`. `profiles.id` is a generated row UUID, never equal to
  `auth.uid()` (confirmed directly against Trevor J.'s own admin row: `id`
  and `user_id` differ). These policies can never match, so RLS has never
  actually granted admin access on those four tables — the admin dashboard
  has worked regardless because its routes use `requireAdmin()` with the
  service-role key server-side, which bypasses RLS entirely. This migration
  fixes the equivalent pattern only on `profiles`/`public_profiles` (the
  tables in scope for this work); the other four tables' policies are
  unchanged and still non-functional at the RLS level. Fixing them is a
  mechanical follow-up (same one-line `id` → `user_id` change, times 15).
- **`shared_spaces` visibility is implemented**, not stubbed — it checks
  actual mutual `space_memberships` — but has not been exercised by any
  UI control yet; nothing currently sets a profile's `profile_visibility`
  to `shared_spaces`.
- **`profile_tagline` and `photo_confirmed`**, referenced in application
  code (`app/onboarding/page.tsx`'s photo-confirmation gate,
  `app/members/[id]/page.tsx`'s tagline display), are not columns in the
  live `profiles` schema and are not written by `saveProfileToSupabase()`'s
  upsert. Unlike the `connection_comfort_level` bug fixed in migrations
  036–038, this doesn't block any write — these two fields simply never
  round-trip to the database, so `photo_confirmed` resets to unset on every
  fresh session and `profile_tagline` input is silently discarded. Lower
  severity (nothing fails, no PGRST204), but a real gap. Not fixed here —
  out of scope for a privacy migration, flagged for separate follow-up.
- **`app/auth/callback/route.ts` has its own instance of the `id` vs.
  `user_id` bug**, independent of RLS: it checks
  `.eq("id", user.id)` against `profiles.id` to decide whether a profile
  already exists for an OAuth sign-in, which never matches, so it always
  falls into the "create profile" branch — and that INSERT sets `id:
  user.id` but never sets `user_id` at all, which should fail the `NOT
  NULL` constraint on `profiles.user_id`. Not clear whether this code path
  is ever actually exercised by the app's current auth flows; flagged for
  separate investigation, not fixed here.
