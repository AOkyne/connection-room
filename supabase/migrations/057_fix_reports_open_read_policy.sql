-- Found during live verification testing of migration 055 (which added
-- reports_admin_select/reports_admin_update): a completely unrelated,
-- non-admin, non-reporter member could SELECT any row in `reports`,
-- including reports they had no connection to at all. This predates
-- migration 055 -- 055 only added a more permissive admin-scoped SELECT
-- policy, it never touched or loosened "Users can read own reports"
-- (migration 001, reporter_id = auth.uid()). The only explanation
-- consistent with Postgres RLS semantics (multiple permissive policies
-- for the same command are OR'd together) is a policy on `reports`
-- granting broader read access that exists live but has no corresponding
-- migration file in this repo -- the same category of issue migration 040
-- found and fixed on `profiles` ("profiles_public", USING (true)).
--
-- Since the rogue policy's exact name is unknown (it predates this
-- migration and was never tracked), this drops every existing policy on
-- `reports` by querying pg_policies directly, then recreates exactly the
-- four that should exist: the original owner insert/select policies from
-- migration 001, and the two admin policies added in migration 055. This
-- guarantees a clean, fully-known policy set regardless of what was live
-- before, rather than guessing at the rogue policy's name.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON reports', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can read own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "reports_admin_select"
  ON reports FOR SELECT
  USING (is_profile_admin(auth.uid()));

CREATE POLICY "reports_admin_update"
  ON reports FOR UPDATE
  USING (is_profile_admin(auth.uid()));

-- =====================================================================
-- ROLLBACK NOTES
--
-- Do not reintroduce a blanket/permissive SELECT policy on `reports` --
-- that is the exact exposure this migration closes (any signed-in member
-- could otherwise read every other member's safety/moderation reports,
-- including who reported whom and why).
-- =====================================================================
