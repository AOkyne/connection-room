# Changelog

Major milestones, grouped by theme rather than by commit — this repository
has 650+ commits and no release-tagging convention, so this is not a
complete commit-by-commit history. Anchored to migration numbers
(`supabase/migrations/`) where possible, since those are dated and ordered;
see [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md#migration-history-notes) for
migration-level detail on the entries below.

## Initial community platform

Core schema and app shell: `profiles`, `spaces`, `space_memberships`,
`posts`, `comments`, `reactions`, `reports`, `couples_profiles` (migration
001). Started as a localStorage-only demo shell before Supabase was wired
up as the real backend.

## Admin dashboard

Admin role, activity logging, offers, and event-registration tables and
policies (migrations 012, 019).

## Real Connections (formerly "Pairings")

Connection requests, active connections, and real-time chat backed by
Supabase (migration 010), followed by a terminology migration from
"Pairing" to "Connection" (migration 027) and its follow-up fixes
(migrations 036, 038) after the original rename silently failed to touch
any real columns. Server-side matching (`app/api/matching/find`) was later
added so private scoring fields never reach the browser.

## Events and offers

Events table and admin CRUD (migrations 029, 031), through several RLS
tightening passes (032, 033, and later 046) and registration-schema fixes
(034, 035).

## Daily Companion

Dedicated content tables (`daily_companion_content`,
`daily_companion_days`, migration 024) and seed content (025), replacing
content that had previously only been referenced in RLS policies without
ever being backed by real tables. Content-discovery theme tagging followed
(migration 028).

## Profile privacy overhaul

`profiles` locked down to owner/admin-only access; introduced
`public_profiles` and `public_profiles_view` as the safe, cross-member-
readable layer (migration 039), closing a real leak where any signed-in
member could read any other member's full profile, including sensitive
fields, with no application-level guard on the one page that rendered
member profiles directly. Immediately followed by several critical
same-day fixes: RLS infinite recursion (041), a sync-trigger ambiguous-
column bug that silently broke every profile write (042, 043), a dedicated
non-recursive admin-check function (044, 047), and a fix for the masking
view not enforcing row-level visibility at all (045).

## Member-controlled profile visibility expansion

Brought age, orientation, relationship status, why-joined, and connection
intentions back into `public_profiles` as individually-toggleable,
member-controlled fields (migration 053) — the privacy overhaul had
removed them entirely with no opt-in path, leaving profiles feeling empty.
Built the actual settings UI (`components/members/ProfileVisibilitySettings.tsx`)
for the first time alongside it.

## Security remediations

A live `pg_policies` audit (documented in
[`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md)) found and fixed
undocumented, unconditionally-permissive RLS policies on `profiles`
(migration 040) and on `events`/`articles`/`couples_profiles` (migration
046). Storage RLS gaps that had silently forced all photo/image uploads
into base64 fallbacks were fixed for profile photos (048), event images
(049), and broadcast images (051).

## Space activity notifications

Email notifications for new space posts, with member-chosen frequency, via
a Postgres trigger + webhook for immediate notifications and a separate
cron-driven digest path for daily/weekly summaries (migration 054).

## This documentation refresh

Rewrote `README.md`, `ARCHITECTURE.md`, and `DATABASE_SCHEMA.md`; rewrote
`PRIVACY_SECURITY_MODEL.md` to correct several stale claims (an out-of-date
"not yet applied to production" status, and RLS findings that a later
migration had already fixed); added `PRODUCT_PRINCIPLES.md`, `ROADMAP.md`,
and this file; retired `FEATURE_LIST.md`. Also surfaced several
previously-undocumented implementation gaps during the audit (see each
document's "Known limitations"/"Known schema risks" section) — none of
which were fixed as part of this pass, per scope.
