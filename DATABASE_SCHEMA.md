# Database Schema

PostgreSQL on Supabase, protected by Row Level Security (RLS). This document
explains each table's purpose, relationships, and access rules rather than
listing every column — for exact column lists, the migration files in
`supabase/migrations/` are authoritative. Primary keys are UUID throughout
unless noted otherwise (an earlier version of this document claimed
human-readable TEXT primary keys for demo-mode compatibility; that was never
true of the live schema and has been corrected here).

See [`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md) for the full
privacy rationale behind the profile tables, and
[`ARCHITECTURE.md`](ARCHITECTURE.md) for how the application layer uses
these tables.

## Core identity and profile

### `profiles`
Private, canonical profile data — every field a member has ever entered,
including sensitive ones. Primary identifier: `id` (an internal row UUID,
distinct from `user_id`). `user_id` references `auth.users(id)`. Read by:
the owner, or an admin. Written by: the owner (insert/update), or an admin
(update). No other member can read this table. Related: `role` drives admin
gating everywhere in the app; `spaces_joined` is kept in sync with
`space_memberships` by a migration-050 trigger; `invite_code`/
`invited_by_profile_id` back the invite system.

### `public_profiles`
The safe, cross-member-readable subset of profile data, plus the member's
own visibility preferences (`profile_visibility`, and one `show_*` boolean
per toggleable field). Primary identifier: `user_id`. Kept in sync with
`profiles` by the `sync_public_profile` trigger, which fires on every
`profiles` insert/update. Read by: the owner and admins fully; other
authenticated members per the row's `profile_visibility` and per-field
`show_*` flags; nobody unauthenticated. Written by: the sync trigger (most
columns), and the owner directly for their own `show_*`/`profile_visibility`
settings (the trigger never touches those). Related feature: the entire
member-controlled visibility system — see
[`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md).

### `public_profiles_view`
Not a table — a `security_invoker` view over `public_profiles` that
additionally nulls individual columns per the row's own `show_*` flags. All
application cross-member profile reads go through this view, never the raw
table. See [`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md) for why
a view is used here specifically for column-level masking, layered on top
of the table's own row-level RLS.

### `couples_profiles`
Extended profile for a couple (partner names, relationship structure,
goals, boundaries). Primary identifier: `id`; references two partner user
ids. **Not referenced anywhere in current application code** (confirmed by
repo-wide search) — appears to be schema-only, unused by any live feature.
Its RLS was tightened in migration 046 (dropped a blanket
`USING (true)` policy for authenticated members) even though nothing
currently reads it, closing the exposure regardless.

## Community: spaces, posts, comments, reactions

### `spaces`
Topical community discussion areas (e.g. "The Commons," "Embodiment
Practice"). Primary identifier: `id`. Read by: effectively everyone
authenticated (spaces are meant to be browsable). Written by: admin tooling
only, in practice. Related: `theme_tags` (migration 028) drives
"related to today's theme" discovery.

### `space_memberships`
Which members have joined which spaces. Primary identifier: `id`;
`(user_id, space_id)` is unique. Read by: authenticated members broadly
(used for member-count and shared-space checks). Written by: a member,
for their own membership rows only. This is the real source of truth for
space membership — `profiles.spaces_joined` is a denormalized mirror kept
in sync by a trigger added in migration 050 (before that migration, it was
never actually populated, despite being read in a dozen-plus places across
the app).

### `posts`
Discussion posts within a space. Primary identifier: `id`. The body column
is named **`body`**, not `content` (an important, previously-real bug in
this app: the write path once inserted a `content` key that doesn't exist
on this table, silently failing every write and falling back to
`localStorage` — fixed; see [`CHANGELOG.md`](CHANGELOG.md)). Read by: space
members (in practice, broadly readable to authenticated members). Written
by: the author, for their own posts. `author_name`/`author_pronouns`/
`author_photo` are denormalized onto the row at write time, so rendering a
post never has to query another member's profile. `is_prompt_response` is
not a stored column — it's derived at read time from whether `prompt_id` is
set.

### `comments`
Comments on a post. Same `body`-not-`content` note as `posts` applies.
Same author-denormalization pattern. Read/write rules mirror `posts`.

### `reactions`
Lightweight reactions on a post or comment. Primary identifier: `id`;
unique per `(user_id, post_id, reaction_type)` and `(user_id, comment_id,
reaction_type)`. Read by: space members. Written by: the reacting member,
for their own reactions only.

### `reports`
Member reports of content or other members. Present in the schema, and
queried by `app/app/admin/page.tsx` for a count/list on the admin overview.
**The actual Connection-concern reporting flow does not write to this
table at all**: `reportConnectionConcern()` (`lib/data/connections.ts`) and
the admin Concerns page (`app/app/admin/concerns/page.tsx`) both read and
write a `localStorage` key (`connection-room:connection-reports`) instead —
meaning a concern filed by one member is only ever visible in that same
browser's local storage, not to an admin on a different device. This is a
real, currently-live functional gap, not a documentation error; see
"Known schema risks."

## Connections

### `connection_requests`
An outgoing request from one member to another to start a Connection.
Primary identifier: `id`. Read by: the two parties involved. Written by:
the sender (insert), the recipient (update, to accept/decline).

### `connections`
An active/confirmed Connection between two members, created when a request
is accepted. Primary identifier: `id`; `user_id`/`partner_id` reference
`auth.users(id)` directly (not `profiles.id`). `status` moves through
`pending_their_acceptance → confirmed → active → completed` (or
`declined`). Read by: either party. Written by: the accepting party
(insert), either party (status updates).

### `connection_messages`
Chat messages within an active Connection. Primary identifier: `id`;
`connection_id` references `connections(id)`. Read/written by: either
party to that connection.

### `connection_preferences`, `connection_milestones`
Member-level connection preferences and milestone/practice tracking. See
`lib/data/connection-practice.ts` for the milestones consumer.

### Legacy, unused connection-adjacent tables
`pairings`, `pairing_preferences`, `pairing_reports` (defined only in the
old, unused `lib/supabase/schema.sql`, not in any applied migration) and
`pairing_interests` (defined in an applied migration, but with **zero**
application code references) are all pre-"Connections"-rename artifacts.
`lib/data/pairings.ts` is a similarly orphaned, localStorage-only data file
with no import references anywhere in the app — the live Connections
feature is entirely implemented by `lib/data/connections.ts` and
`lib/data/connectionRequests.ts` instead. See "Migration history notes"
below and [`CHANGELOG.md`](CHANGELOG.md).

## Events and offers

### `events`
Workshops, circles, and retreats. Primary identifier: `id`. Went through
several schema revisions (migration 031 added most of the fields the admin
UI actually uses: `slug`, `event_type`, `status`, `start_at`/`end_at`,
`timezone`, `location_*`, etc.). Read by: effectively public/anyone
authenticated. Written by: admins only, at the RLS level, as of migration
046 (see "Known schema risks" — this was a real, since-fixed gap).

### `event_registrations`
A member's registration/interest status for an event. Primary identifier:
`id`; unique per `(event_id, profile_id)`. `status` includes `registered`,
`interested`, `cancelled`, `attended`, `no_show` (the `interested` value
was added in migration 034 after the app already needed it). Read by: the
registrant and admins. Written by: the registrant, for their own
registration. **Still carries the broken `profiles.id = auth.uid()`
admin-check pattern** — see "Known schema risks."

### `event_interests`
An older, separate table for event interest. **No application code
references it** — superseded by `event_registrations.status = 'interested'`.
Legacy/orphaned.

### `offers`
Admin-managed catalog of coaching/retreat/service offers (title, pricing,
CTA, related space/event). Read by: effectively public. Written by: admins
(intended) — see "Known schema risks" for the same broken admin-check
pattern here too.

## Daily Companion and reflections

### `daily_companion_content`, `daily_companion_days`
The production source for the Daily Companion's rotating daily content
(theme, reflection prompt, embodiment practice, body check-in, conversation
invitation, quote). Created in migration 024, seeded in migration 025.
Read by: effectively all authenticated members (content is not
member-specific). Written by: admins, via the Daily Companion editor.

### `weekly_notes`
The table the application actually queries for "This Week from Trevor"
(`lib/data/daily-companion.ts`'s `getTrevorWeeklyNote()`). **This table
name does not match any `CREATE TABLE` in this repo's migrations** — migration
024 created a same-purpose table named `weekly_companion_notes` instead,
and an earlier migration (009) references `weekly_notes` only in
conditional (`IF EXISTS`) RLS statements, never creating it. Live queries
against `weekly_notes` during this documentation pass returned real, seeded
rows (`rotation_index`/`week_number`/`title`), confirming the table exists
and is populated in production — but there is no migration file in this
repo that creates it. See "Known schema risks."

### `user_reflections`
A member's own responses to daily/weekly prompts, with a public/private
flag. Read/written by: the owner only. `first_prompt_response` on `profiles`
is a related, older, separate field (a member's very first prompt
response, optionally surfaced via `public_profiles.selected_reflection` —
see [`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md)).

### Guided Rhythm: `guided_rhythm_progress`, `custom_rhythm_content`
The slower, month/week-oriented cadence layered under the daily rotation
(see [`ARCHITECTURE.md`](ARCHITECTURE.md#daily-companion)). Read/written by
the owner for their own progress; content tables are admin-managed.

## Onboarding and journey

### `first_week_journey_progress`
Tracks a new member's progress through the "Seven Doors" first-week
onboarding journey. Read/written by: the owner. Notably, migration 009's
RLS for this table currently allows reading *any* user's progress ("allow
reading any user's progress for now") — a permissive placeholder, not a
deliberately scoped policy; see "Known schema risks."

## Articles

### `articles`
Synced from Substack (`app/api/sync-substack`, `app/api/cron/sync-substack`)
and surfaced as "From My Writing" / Trevor Notes. **No `CREATE TABLE`
migration for this table exists in this repo**, despite it being actively
written to and read from in production, and despite two later migrations
(028, 046) altering its columns and RLS. It was almost certainly created
directly against the database outside the tracked migration history — the
same category of gap migration 040 found and fixed for undocumented
`profiles` policies. Read by: effectively public. Written by: the
service-role Substack sync route only, as of migration 046 (which dropped
a rogue `WITH CHECK (true)` policy for the `public` role that had allowed
anyone, including unauthenticated requests, to insert arbitrary rows).

## Badges

**No `badges` or `user_badges` table exists in the live, migration-tracked
schema.** (`lib/supabase/schema.sql`, the old pre-migrations schema file,
defines both — but that file is unused; see the note in
[`README.md`](README.md#database-setup).) Badge/achievement display is
computed client-side from a member's actual activity data, not stored in a
dedicated table.

## Admin and platform

### `platform_settings`
Generic key/value configuration table (migration 026), intended to move
hardcoded values like the content-rotation launch date out of code. As of
this writing, the actual launch-date anchor is still a hardcoded constant
in `lib/data/daily-companion.ts`, not read from this table — see
[`CHANGELOG.md`](CHANGELOG.md) and the "Known documentation/implementation
gaps" section of [`README.md`](README.md).

### `admin_activity_logs`
An audit trail of admin actions. Read by: admins (intended) — **still
carries the broken `profiles.id = auth.uid()` admin-check pattern**; see
"Known schema risks."

### `email_templates`, `drip_emails_sent`, `notification_log`
Back the admin broadcast-email composer, the day-5/14/30 onboarding drip
sequence, and general notification logging respectively.

### `invite_relationships`
Tracks which member invited which other member, keyed off `profiles.id`
(the internal row PK). Cross-member reads of this table go through a
dedicated API route (`app/api/invites/friends`) rather than direct client
queries, for the same reason profile cross-reads do — see
[`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md).

## Storage

Two confirmed Storage buckets with RLS-backed policies added by migration:
`profile-photos` (migration 048 — the bucket itself pre-dates this repo's
migration history and was created directly in Supabase; only its RLS
policies are tracked here) and `event-images` (migration 049, admin-only
write). A third, `broadcast-images` (migration 051), backs images inserted
into admin broadcast emails, admin-only write. All three are public-read.

## Profile data flow

```text
profiles (private, full data)
    → sync_public_profile trigger (fires on every INSERT/UPDATE)
    → public_profiles (safe subset + member's own show_*/visibility settings)
    → public_profiles_view (column-masks per show_* flags)
    → application cross-member reads (getPublicProfile, etc.)
```

The owner's own `show_*`/`profile_visibility` settings are the one
exception to this flow — they're written directly to `public_profiles` by
the profile-settings UI, since the sync trigger only ever mirrors data
*from* `profiles` and has no concept of visibility preferences.

## RLS summary

| Table | Anonymous | Authenticated member | Profile owner | Admin |
|---|---|---|---|---|
| `profiles` | none | none (unless owner) | full | full |
| `public_profiles` | none | per `profile_visibility`/`show_*` | full | full |
| `posts` / `comments` | none | read (space members); write own | full on own rows | delete any (migration 052) |
| `reactions` | none | read/write own | — | — |
| `spaces` | none | read | — | write (admin tooling) |
| `space_memberships` | none | read broadly; write own | — | — |
| `events` | none | read | — | write (as of migration 046) |
| `event_registrations` | none | write own | read/write own | read (policy present, but broken check — see below) |
| `offers` | none | read | — | write (policy present, but broken check) |
| `articles` | public read | read | — | write (service-role sync route only) |
| `admin_activity_logs` | none | none | — | read (policy present, but broken check) |
| `couples_profiles` | none | none (as of migration 046) | full | — |

"Broken check" means the policy exists and is enabled, but its condition
(`profiles.id = auth.uid()`) can never be true, so it grants no one access
at the RLS level — admin functionality on these tables works only because
the relevant application code uses `requireAdmin()` with the service-role
key, which bypasses RLS entirely. This is a real, confirmed gap, not a
documentation simplification — see "Known schema risks."

## Migration history notes

- **`027_rename_pairing_to_connection.sql`** attempted the "Pairings" →
  "Connections" terminology migration, but the specific columns it tried to
  rename never existed on `profiles` in the first place — the rename
  silently did nothing. Migrations 036 (added the correctly-named columns
  fresh) and 038 (migrated any real orphaned data from the old columns)
  finished the job.
- **`039_profile_privacy_overhaul.sql`** is the profile privacy overhaul:
  locked `profiles` down to owner/admin only and introduced
  `public_profiles`. It shipped with two serious bugs, both found and
  fixed via live two-account testing immediately after: infinite RLS
  recursion on `profiles` (**041**) and an ambiguous-column error in the
  sync trigger that silently failed every profile write (**042**, then
  **043** for a more complete fix). **045** separately fixed
  `public_profiles_view` not enforcing row-level visibility at all (a
  `SECURITY DEFINER`-by-default view behavior, not the `SECURITY INVOKER`
  the original comment assumed).
- **`040_drop_undocumented_profiles_policies.sql`** removed five RLS
  policies that existed live in production with no corresponding migration
  file — including one, `profiles_public`, that granted unconditional read
  access to every profile row to anyone, unauthenticated included,
  regardless of 039's restrictions (Postgres RLS policies are OR'd
  together). This is the confirmed precedent for why live database state
  cannot be assumed to match this repo's migration history.
- **`046_fix_events_articles_couples_rls.sql`** fixed three additional
  RLS gaps found during the same live audit that produced
  [`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md): unrestricted
  authenticated write access on `events`, unrestricted anonymous insert on
  `articles`, and unrestricted authenticated read on `couples_profiles`.
  It explicitly did **not** fix the same broken-admin-check pattern on
  `offers`, `event_registrations`, or `admin_activity_logs` — flagged as
  out of scope at the time, still unfixed.
- **`048_profile_photos_storage_policies.sql`** and
  **`049_event_images_storage_bucket.sql`** fixed a real photo-upload gap:
  the `profile-photos` bucket existed but had no Storage RLS policy
  granting insert access, so every upload silently fell back to a base64
  string stored directly in `profiles.profile_photo` (confirmed live: one
  real profile photo was 4.3MB of base64 text).
- **`050_sync_spaces_joined_from_memberships.sql`** fixed
  `profiles.spaces_joined` never actually being populated from
  `space_memberships`, despite being read in a dozen-plus places across the
  app.
- **`052_posts_comments_admin_delete.sql`** fixed admin post/comment
  deletion silently doing nothing — Postgres RLS filters a `DELETE` to zero
  matched rows rather than erroring, so a missing admin-bypass policy
  looked like success in the UI while deleting nothing.

## Known schema risks

- **Duplicate migration numbers and gaps.** Two pairs of files share a
  number (`005_add_first_week_journey.sql` /
  `005_add_space_visit_tracking.sql`, and
  `029_create_events_table.sql` / `029_seed_theme_tags.sql`), and numbers
  `022`, `023`, and `030` do not exist in this repo at all. Apply migrations
  in filename order regardless; nothing here indicates the missing numbers
  represent lost/unapplied work, but it has not been independently
  verified.
- **`weekly_notes` vs. `weekly_companion_notes`.** The application queries
  `weekly_notes`; migration 024 creates `weekly_companion_notes`. Live
  queries during this documentation pass confirm `weekly_notes` exists and
  is populated in production, but no migration in this repo creates it —
  meaning either it was created out-of-band, or `weekly_companion_notes`
  was renamed outside the tracked migration history. Unresolved; flagged
  rather than guessed at.
- **`articles` has no `CREATE TABLE` migration** in this repo at all,
  despite being actively used and having its RLS altered by two later
  migrations. Created out-of-band, same category as the undocumented
  `profiles` policies migration 040 found and fixed.
- **Broken admin-check pattern still live on `offers`, `event_registrations`,
  and `admin_activity_logs`**: `EXISTS (SELECT 1 FROM profiles WHERE id =
  auth.uid() AND role = 'admin')` can never match, since `profiles.id` is a
  generated row UUID, never equal to `auth.uid()`. Confirmed still present
  after migration 046 fixed the identical pattern on `events`. Does not
  currently block admin functionality (admin routes use the service-role
  key), but means RLS itself offers no real protection or fallback on
  these three tables if that assumption ever changes.
- **`first_week_journey_progress`'s public-read policy** ("allow reading
  any user's progress for now," migration 009) is a permissive placeholder
  that has never been tightened.
- **Connection-concern reporting is `localStorage`-only.**
  `reportConnectionConcern()` and the admin Concerns page both operate on a
  `localStorage` key, never the `reports` table — a concern filed by a
  member is invisible to an admin on a different device or browser. This
  is a functional moderation gap, confirmed by direct code inspection, not
  a documentation staleness issue.
- **Legacy, unused tables**: `couples_profiles`, `pairings`,
  `pairing_preferences`, `pairing_reports`, `pairing_interests`,
  `event_interests` all exist in the schema (or, for the `pairing_*` set
  outside migrations, in the unused `lib/supabase/schema.sql`) with no
  live application code reading or writing them.
- **`lib/supabase/schema.sql`** is a standalone, pre-migrations-era schema
  file, not referenced by any code or tooling in this repo, describing a
  meaningfully different shape (e.g. `profiles.id` directly as the auth
  user id, `space_members` instead of `space_memberships`) than the live,
  migration-built schema. Do not treat it as current.
- **Production migration status has not been independently re-verified
  for this documentation pass** beyond the live spot-checks noted above
  (`weekly_notes` contents, and prior sessions' direct testing of
  `public_profiles_view`, `event_registrations`, storage uploads, etc.,
  all of which succeeded against production). Given migration 040's
  precedent of live policies with no matching migration file, and the
  `articles`/`weekly_notes` gaps found in this same pass, treat any
  security-relevant claim in this document as needing a direct
  `pg_policies` check before being relied on for a new security-sensitive
  change.
