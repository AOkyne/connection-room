-- Fixes three issues found during the full pg_policies sweep documented in
-- PRIVACY_SECURITY_MODEL.md under "Live RLS audit findings (2026-07-15)".
-- All three are pre-existing, unrelated to the profile-privacy work in
-- 039-045, and were deliberately left unfixed at the time pending this
-- follow-up migration.

-- =====================================================================
-- 1. events: allow_authenticated_{update,delete,insert} let ANY signed-in
--    member modify or delete ANY event, not just admins.
--
-- These came from 033_fix_events_rls.sql, which disabled RLS, dropped
-- everything, and reinstated blanket USING (true) / WITH CHECK (true)
-- policies "to ensure authenticated users can create/update events" --
-- almost certainly a debugging workaround that was never tightened back
-- up afterward.
--
-- Before simply dropping them, checked whether the admin-scoped
-- equivalents from 012_admin_dashboard_launch.sql ("Admins can insert
-- events" / "Admins can update events" / "Admins can delete events" /
-- "Admins can view all events") would actually cover admin write access
-- once the permissive ones are gone. They do not: those four policies use
-- EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
-- -- profiles.id is a generated row UUID, never equal to auth.uid(), the
-- exact broken pattern documented in 039's "Known limitations" section and
-- confirmed still live on events (along with offers, event_registrations,
-- admin_activity_logs) by this same audit. Dropping allow_authenticated_*
-- without fixing these would leave events with NO working write access
-- for anyone at the RLS level (the admin dashboard would keep working
-- regardless, since it writes through requireAdmin() with the
-- service-role key server-side, which bypasses RLS entirely -- but RLS
-- itself would offer zero real protection or fallback).
--
-- Fix: drop the blanket authenticated policies, and repoint the four
-- existing "Admins can ..." policies at is_profile_admin(), the dedicated
-- plpgsql helper introduced in 044_dedicated_admin_check_function.sql
-- specifically to avoid both the id/user_id bug and the planner-inlining
-- ambiguity that a SQL-language is_admin() hit when used on a
-- same-table-querying policy. This is the same mechanical fix 039/044
-- already applied to profiles/public_profiles; offers, event_registrations,
-- and admin_activity_logs still have the broken pattern and are not
-- touched here -- out of scope for this migration.

DROP POLICY IF EXISTS "allow_authenticated_update" ON events;
DROP POLICY IF EXISTS "allow_authenticated_delete" ON events;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON events;

DROP POLICY IF EXISTS "Admins can view all events" ON events;
CREATE POLICY "Admins can view all events"
  ON events FOR SELECT
  USING (is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert events" ON events;
CREATE POLICY "Admins can insert events"
  ON events FOR INSERT
  WITH CHECK (is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update events" ON events;
CREATE POLICY "Admins can update events"
  ON events FOR UPDATE
  USING (is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete events" ON events;
CREATE POLICY "Admins can delete events"
  ON events FOR DELETE
  USING (is_profile_admin(auth.uid()));

-- Public read access ("allow_all_select" from 033, "Anyone can view
-- published events" from 012) is untouched -- events are meant to be
-- publicly readable and neither policy grants write access.

-- =====================================================================
-- 2. articles: "Allow api insert" has WITH CHECK (true) for role public --
--    literally anonymous, unauthenticated requests can insert arbitrary
--    article rows.
--
-- The only real write path into articles is app/api/sync-substack/route.ts
-- (also invoked via app/api/cron/sync-substack/route.ts), which uses
-- createClient() with SUPABASE_SERVICE_ROLE_KEY -- a service-role client
-- bypasses RLS entirely, so it was never relying on this policy in the
-- first place. lib/admin/sync-articles.ts, the only other code that
-- touches article sync, just calls that API route over fetch(); it does
-- not write to the articles table directly. No application code path
-- needs "Allow api insert" to exist, so it is dropped outright with no
-- replacement policy, the same way couples_profiles' rogue policy is
-- handled below.

DROP POLICY IF EXISTS "Allow api insert" ON articles;

-- =====================================================================
-- 3. couples_profiles: "Couples profiles readable by authenticated users"
--    has USING (true) for role authenticated -- any signed-in member can
--    read every couple's full row, including relationship_structure,
--    couple_goals, and couple_boundaries. Same category of exposure as
--    the original profiles bug 039 fixed; this sibling table was never
--    addressed, and this policy has no corresponding entry in this repo's
--    migration history -- the same kind of undocumented live policy 040
--    found and dropped on profiles.
--
-- 001_beta_schema.sql already created a correctly-scoped policy on this
-- table, "Partners can read their couples profile" (USING
-- (partner_1_user_id = auth.uid() OR partner_2_user_id = auth.uid())),
-- which remains untouched and continues to work once the blanket one is
-- gone. No application code (grepped lib/, app/, components/) references
-- couples_profiles at all, confirming there is no live cross-member read
-- path relying on the rogue policy.

DROP POLICY IF EXISTS "Couples profiles readable by authenticated users" ON couples_profiles;

-- =====================================================================
-- ROLLBACK NOTES
--
-- events: re-creating allow_authenticated_{update,delete,insert} would
-- restore the "any signed-in member can modify or delete any event" bug
-- this migration fixes -- do not do this. Reverting the four "Admins can
-- ..." policies to the id = auth.uid() form would restore the
-- never-matches-anything bug from migration 012 -- also do not do this.
--
-- articles: there is no safe rollback for "Allow api insert". Re-creating
-- it would restore unauthenticated insert access to arbitrary rows.
--
-- couples_profiles: there is no safe rollback for "Couples profiles
-- readable by authenticated users". Re-creating it would restore
-- unconditional cross-member read access to every couple's private
-- fields, exactly the exposure this migration exists to close.
-- =====================================================================
