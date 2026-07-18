# Privacy & Security Model

How member profile data is protected in The Connection Room. Originally
written for migration `039_profile_privacy_overhaul.sql` and extended by
migration `053_profile_visibility_expansion.sql`. Supersedes the
profile-related sections of `RLS_POLICIES.md`, which described the
pre-launch, never-locked-down model and is now stale.

**Guiding principle: identity can be visible, vulnerability should be
chosen, safety information stays private.** Migration 039 fixed a real leak
by locking `profiles` down, but the member-visible layer it shipped
(`public_profiles`) only carried enough fields to make a profile feel
half-empty — no age, orientation, relationship status, or story. Migration
053 brought a curated set of those fields back, individually toggleable,
with sensible defaults: identity/story fields default visible, deeper/
vulnerable fields default hidden. Privacy should create choice, not
emptiness.

## Status

Migrations 036 through 054, including the profile privacy overhaul (039)
and its five follow-up fixes (040–045, 047), the profile visibility
expansion (053), and the RLS gaps found in the same audit (046), have been
applied to production — confirmed by direct, live testing throughout this
project's history (two-account verification testing at the time each
migration was written, and repeated direct queries against
`public_profiles_view`, `profiles`, and related tables in subsequent work).
Do not treat this as a permanent guarantee, though: migration 040's own
history (five RLS policies found live with no corresponding migration file)
is a standing reminder that this repo's migration files are not, on their
own, a fully reliable record of live database state. Before relying on any
specific RLS behavior for a new security-sensitive change, verify it
directly against the live database (`pg_policies`), not just this document.

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

## Privacy philosophy

The Connection Room is a private, members-only community, not a public
social network or a dating app. Member profiles should be meaningful and
human — a name, a face, a sense of who someone is and why they're here —
while the member retains control over what crosses from "known" into
"vulnerable." The two-table model below exists specifically so that adding
a new private field to `profiles` later can never leak by default; it has
to be deliberately, explicitly mirrored into the public layer.

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
`spaces_joined`, `is_seeded`, plus visibility settings and, since migration
053, the additional fields listed under "Field-level controls" below. Kept
in sync with `profiles` automatically by a trigger (`sync_public_profile`)
that fires on every `profiles` INSERT/UPDATE — no application write path
needs to remember to write to both tables.

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
`show_interests`, etc.). This exists because RLS is row-level only — it
cannot express "hide this one column for this one row." The view carries
`security_invoker` (fixed in migration 045 — see below), so it runs with
the querying user's own RLS permissions on `public_profiles`; it only masks
columns, it grants no additional row access beyond what `public_profiles`'
own policies already allow.

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

## Information categories

Classification of profile information, based on the actual implementation
in `public_profiles`/`profiles` (not an idealized model):

**Member-visible by default** (in `public_profiles`, `show_* = TRUE` by
default): display name, profile photo, pronouns, general location,
interests, age range, orientation, relationship status, why they joined,
connection intentions, member-since date (no toggle — shown whenever the
profile itself is visible, same tier as display name).

**Optional / member-controlled, default hidden**: quiz result ("intimacy
pattern"), connection comfort level (preferred ways to connect), a selected
reflection (opted-in first prompt response). A member can turn any of these
on. Badges, journey progress, and event attendance are **not** currently
implemented as shareable at all — no column or `show_*` flag exists for
them, because no cross-member display surface for them exists yet either;
see "Known limitations."

**Permanently private, no sharing path**: everything in `profiles` not
mirrored into `public_profiles` — including `connection_boundaries`,
detailed matching preferences, unpublished quiz answers, onboarding
responses not explicitly selected for display, moderation/report data,
blocks, and all account/billing/security data (email lives only in
`auth.users`; there is no phone or exact-birth-date column anywhere in the
schema).

## Profile visibility states

`profile_visibility` on `public_profiles`: `hidden` (owner/admin only),
`members_only`, `shared_spaces` (visible to members who share a space with
the owner), `member_discovery`. `members_only` and `member_discovery`
currently resolve identically at the RLS level (any authenticated member) —
kept as separate states in case a future release wants discovery-surfaced
profiles to differ from directly-linkable ones, but no such distinction is
implemented today. The profile-settings UI only ever writes `members_only`,
`shared_spaces`, or `hidden` — `member_discovery` stays reserved/unused.

`shared_spaces` is a fully working RLS check (real mutual
`space_memberships` lookup), not a stub — but as of this writing, no UI
control actually sets a profile to this state, so it has not been exercised
in production.

## Field-level controls

| Field | Default | Owner can hide via |
|---|---|---|
| `pronouns` | shown | `show_pronouns` |
| `location` (general) | shown (since migration 053; was hidden in 039) | `show_general_location` |
| `interests` | shown | `show_interests` |
| `age_range` | shown | `show_age` |
| `orientation` | shown | `show_orientation` |
| `relationship_status` | shown | `show_relationship_status` |
| `why_joined` | shown | `show_why_joined` |
| `connection_intentions` | shown | `show_connection_intentions` |
| `quiz_result` ("intimacy pattern") | **hidden** | `show_quiz_result` |
| `connection_comfort_level` | **hidden** | `show_connection_comfort_level` |
| `selected_reflection` | **hidden** | `show_selected_reflection` |
| recent posts (app-layer, not a column) | hidden | `show_recent_posts` |
| discovery inclusion | shown | `show_in_discovery` |
| `member_since` | always shown when the profile is visible | n/a (no toggle) |

New members get these defaults automatically (the columns' own `DEFAULT`
values). Existing members at the time migration 053 shipped were backfilled
to the same defaults, not left null.

`orientation`, `relationship_status`, `age_range`, why-joined, and
connection-intentions were **not** in `public_profiles` at all as of
migration 039 — fully private, no opt-in path. Migration 053 brought them
back, member-controlled, default **visible**, per updated product
direction: hiding the fields most relevant to real connection worked
against the app's purpose. `connection_boundaries`, detailed matching
preferences, private reflections/onboarding answers not explicitly
selected, moderation/safety data, and all account/billing/admin data remain
**untouched** by migration 053 — never copied into `public_profiles`, never
exposed through the view.

## RLS model

- **Private profile access** (`profiles`): owner and admin only, as
  described above.
- **Community-visible profile access** (`public_profiles` /
  `public_profiles_view`): gated by `profile_visibility` at the row level
  and `show_*` at the column level, as described above.
- **Admin access**: admins can read/update any row in `profiles` and
  `public_profiles`, via RLS policies keyed on `is_profile_admin(auth.uid())`
  — a dedicated, `STABLE`-marked SQL function (migrations 044, 047) that
  exists specifically to avoid two real bugs found in earlier attempts: RLS
  infinite recursion from a self-referencing subquery, and planner-inlining
  ambiguity from a same-table-querying helper function used inside a policy
  on that same table. See [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md#migration-history-notes).
- **Anonymous restrictions**: no policy on `profiles` or `public_profiles`
  grants the `anon` role any access; RLS defaults to deny.
- **Shared-space behavior**: implemented as a real subquery against
  `space_memberships`, not a stub — see "Profile visibility states" above
  for its current (unused) status.
- **Security-invoker views**: `public_profiles_view` explicitly uses
  `security_invoker` (Postgres 15+) so it runs under the querying user's
  own RLS permissions rather than the view owner's — the opposite,
  default-owner behavior was a real bug (migration 045) that made the
  "hidden" visibility state silently not work at all for a period.
- **Relevant helper functions**: `is_profile_admin(auth.uid())`
  (`is_admin()` was an earlier, buggier iteration — see
  [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md#migration-history-notes)).

Server-side connection matching (`app/api/matching/find`) runs with the
service-role key, since scoring legitimately needs `relationship_status`/
`age_range`/`location` for compatibility — but the route only ever returns
a safe subset built from `public_profiles_view`, so a match card respects
each candidate's own visibility flags exactly like every other surface.
`hidden` candidates are excluded from the pool entirely; `shared_spaces`
candidates are excluded unless the caller actually shares a space with
them.

## Admin access

Admins can read and update any member's full `profiles` row and any
`public_profiles` row, enforced at the database level by
`profiles_admin_select`/`profiles_admin_update`-style policies (not merely
a client-side check). This is broad by design — admins are expected to do
real moderation and support work that requires seeing private data — but it
is not unconditional for every table: `offers`, `event_registrations`, and
`admin_activity_logs` currently have an admin-check policy that can never
actually match (see [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md#known-schema-risks)),
so admin access to those specific tables works only because the
application routes to them go through `requireAdmin()` with the
service-role key, not through RLS admin policies at all.

## Anonymous and public-web access

Member profiles are not publicly indexed or anonymously readable. RLS on
`profiles` and `public_profiles` grants nothing to the unauthenticated
`anon` role. `/members/[id]` — the one profile-display route outside the
main `/app` layout — has its own explicit authentication guard (added
during the 039 refactor; it previously had none at all, which was itself
part of the original leak). `articles` is the one table in this schema with
a genuine public-read policy, by design (published writing is meant to be
public).

## Demo isolation

See [`ARCHITECTURE.md`](ARCHITECTURE.md#demo-and-preview-architecture) for
the full mechanism. In summary: demo mode is inferred purely from whether
Supabase environment variables are configured (`lib/app-mode.ts`), not from
a runtime session or URL toggle, and there is no `/preview` route or
guest-mode entry point in the current codebase. In the deployed production
environment, Supabase is always configured, so there is currently no live,
reachable way for an anonymous visitor to write to production data via a
"demo" path.

**Known limitation**: because demo-mode detection is environment-based
rather than session-based, there is no mechanism today to give one specific
visitor a sandboxed demo session while everyone else uses the real
database — the distinction is whole-deployment, not per-request. This is
not currently exploitable (there is no live entry point into it), but if a
`/preview` route or a runtime demo toggle is added later, this conclusion
must be re-verified, not assumed to still hold.

## Known limitations

- **Broken admin-check pattern on `offers`, `event_registrations`, and
  `admin_activity_logs`.** These three tables' admin RLS policies use
  `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role =
  'admin')` — `profiles.id` is a generated row UUID, never equal to
  `auth.uid()`, so these policies can never match. Migration 046 fixed the
  identical pattern on `events`, but explicitly left these three as
  out-of-scope follow-up; still unfixed as of this writing. The admin
  dashboard works regardless, because its routes use `requireAdmin()` with
  the service-role key server-side, bypassing RLS entirely — but RLS
  itself offers zero real protection or fallback on these three tables.
- **`shared_spaces` visibility is implemented but unexercised** — see
  "Profile visibility states."
- **`profile_tagline` and `photo_confirmed`**, referenced in application
  code (`app/onboarding/page.tsx`'s photo-confirmation gate,
  `app/members/[id]/page.tsx`'s tagline display), are not columns in the
  live `profiles` schema and are not written by the profile save path.
  Lower severity than a hard failure (nothing errors), but a real gap:
  `photo_confirmed` resets to unset every fresh session, and
  `profile_tagline` input is silently discarded.
- **`app/auth/callback/route.ts`** checks `.eq("id", user.id)` against
  `profiles.id` to decide whether a profile already exists for an OAuth
  sign-in — this can never match (same `id` vs. `user_id` confusion as
  elsewhere), so it always falls into the "create profile" branch, which
  sets `id: user.id` but never sets the required `user_id` column. Not
  confirmed whether this code path is actually exercised by current auth
  flows (email/password sign-up appears to be the primary path); flagged,
  not independently re-verified in this documentation pass.
- **Badges, event attendance, and journey progress have no cross-member
  display surface or `show_*` flags** — not a gap in the privacy model so
  much as a feature that doesn't exist yet to gate. Add visibility controls
  for these if/when a feature actually surfaces them to other members.
- **`couples_profiles` has no privacy-relevant application code path**
  despite existing in the schema with tightened RLS — flagged as
  effectively dormant, not actively risky.

## Security testing

Test cases that should hold, and were the basis for the live two-account
verification testing referenced throughout this document and
[`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md):

- A signed-in member cannot `SELECT` another member's `profiles` row
  directly (only their own).
- A signed-in member reading another member's `public_profiles_view` row
  never sees a column whose `show_*` flag is `FALSE` for that row.
- A profile with `profile_visibility = 'hidden'` does not appear in any
  cross-member listing, search, or matching result for a non-owner,
  non-admin caller.
- An unauthenticated (anonymous) request cannot read any row of `profiles`
  or `public_profiles`.
- An admin account can read and update any member's `profiles`/
  `public_profiles` row.
- Network responses from any cross-member profile read (browser dev tools
  / API response inspection) contain no field whose `show_*` flag is
  `FALSE`, and no field from `profiles` that isn't mirrored into
  `public_profiles` at all.
