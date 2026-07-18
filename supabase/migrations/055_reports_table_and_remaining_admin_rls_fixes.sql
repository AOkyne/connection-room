-- Two independent fixes flagged as unresolved during the 2026-07
-- documentation audit (see PRIVACY_SECURITY_MODEL.md / DATABASE_SCHEMA.md
-- "Known limitations"/"Known schema risks").

-- =====================================================================
-- 1. Connection-concern reporting has never actually reached the
--    `reports` table. reportConnectionConcern() (lib/data/connections.ts)
--    and the admin Concerns page (app/app/admin/concerns/page.tsx) both
--    read/write a localStorage key instead -- a concern filed by a member
--    is invisible to an admin on any other device or browser. Extends
--    `reports` with the columns the app-layer "Concern" shape actually
--    needs (connection_id, severity, reviewed, admin_notes) so the app
--    code (updated alongside this migration) can write and read real
--    rows instead.
--
--    Separately, `reports` has ALSO never had an admin-read policy at
--    all since it was created in migration 001 -- only
--    "Users can read own reports" (reporter_id = auth.uid()) exists. The
--    admin overview page (app/app/admin/page.tsx) already queries this
--    table directly with the ordinary (anon-key) client, so without an
--    admin policy it has only ever been able to see reports the admin
--    filed themselves, never reports from other members. Adds
--    is_profile_admin()-gated SELECT/UPDATE policies, same pattern as
--    044/046/052.

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS reviewed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- The app's Concerns UI uses 'pending'/'resolved'; the table's existing
-- default was 'open' (migration 001) with no CHECK constraint pinning
-- values, so this is a safe, backward-compatible default change.
ALTER TABLE reports ALTER COLUMN status SET DEFAULT 'pending';

DROP POLICY IF EXISTS "reports_admin_select" ON reports;
CREATE POLICY "reports_admin_select"
  ON reports FOR SELECT
  USING (is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "reports_admin_update" ON reports;
CREATE POLICY "reports_admin_update"
  ON reports FOR UPDATE
  USING (is_profile_admin(auth.uid()));

-- =====================================================================
-- 2. offers, event_registrations, and admin_activity_logs still use
--    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role =
--    'admin') for their admin-only policies -- profiles.id is a
--    generated row UUID, never equal to auth.uid(), so these policies
--    have never matched anything (the same bug 044/046 already fixed on
--    profiles/public_profiles/events). Migration 046 explicitly left
--    these three as out-of-scope follow-up; this is that follow-up.
--    Admin functionality on these tables has worked regardless, because
--    the application routes to them use requireAdmin() with the
--    service-role key server-side, bypassing RLS entirely -- but RLS
--    itself has offered zero real protection or fallback on these three
--    tables until now.

DROP POLICY IF EXISTS "Admins can view all offers" ON offers;
CREATE POLICY "Admins can view all offers"
  ON offers FOR SELECT
  USING (is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert offers" ON offers;
CREATE POLICY "Admins can insert offers"
  ON offers FOR INSERT
  WITH CHECK (is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update offers" ON offers;
CREATE POLICY "Admins can update offers"
  ON offers FOR UPDATE
  USING (is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete offers" ON offers;
CREATE POLICY "Admins can delete offers"
  ON offers FOR DELETE
  USING (is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all registrations" ON event_registrations;
CREATE POLICY "Admins can view all registrations"
  ON event_registrations FOR SELECT
  USING (is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage registrations" ON event_registrations;
CREATE POLICY "Admins can manage registrations"
  ON event_registrations FOR INSERT
  WITH CHECK (is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view activity logs" ON admin_activity_logs;
CREATE POLICY "Admins can view activity logs"
  ON admin_activity_logs FOR SELECT
  USING (is_profile_admin(auth.uid()));

-- =====================================================================
-- ROLLBACK NOTES
--
-- reports: reverting the admin policies to a non-functional check, or
-- dropping them, would restore admins being unable to see other
-- members' reports via RLS (the app would still "work" only insofar as
-- any route that used a service-role client instead). The new columns
-- are additive and nullable; dropping them would break the updated
-- reportConnectionConcern()/Concerns-page code path.
--
-- offers/event_registrations/admin_activity_logs: reverting these four
-- policies to the id = auth.uid() form restores the never-matches-
-- anything bug this migration fixes -- do not do this.
-- =====================================================================
