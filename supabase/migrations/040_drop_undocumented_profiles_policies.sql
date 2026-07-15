-- After applying 039, a live verification query against pg_policies on
-- profiles turned up five policies that exist in production but do NOT
-- correspond to anything in this repo's migration history:
--
--   "Admins can view all profiles"    SELECT  {public}         is_admin(auth.uid())
--   "Profiles insertable by user"     INSERT  {public}          (user_id = auth.uid())
--   "Profiles readable by user"       SELECT  {public}          (user_id = auth.uid())
--   "Profiles updatable by user"      UPDATE  {public}          (user_id = auth.uid())
--   "profiles_public"                 SELECT  {public}          true
--
-- These were applied directly against the database at some point (most
-- likely via the Supabase dashboard's policy editor, given the generic
-- naming and the {public} role rather than {authenticated}), outside of
-- git-tracked migrations. "profiles_public" -- qual = true, role = public,
-- meaning literally anyone, including unauthenticated requests -- meant
-- that even after 039 locked profiles down, this one policy alone still
-- granted unconditional read access to every row, since Postgres RLS
-- policies are OR'd together: 039's restrictive policies did not override
-- it, they just sat next to it doing nothing. This was confirmed live and
-- dropped ad hoc in the SQL Editor before this migration was written; this
-- migration codifies that drop so it's reproducible on any other
-- environment and isn't just an undocumented one-off edit.
--
-- The other four are redundant with 039's profiles_owner_select /
-- profiles_admin_select / profiles_admin_update (same logic, different
-- names) and not independently dangerous, but are dropped here too so the
-- policy list on profiles matches what's in git and future audits aren't
-- second-guessing which of two same-purpose policies is the "real" one.
--
-- is_admin(auth.uid()) is a live database function with no corresponding
-- migration file either. Not dropped or redefined here -- it may be used
-- by policies on other tables this migration doesn't touch. Flagged for a
-- separate audit (see PRIVACY_SECURITY_MODEL.md), not resolved here.
--
-- This finding means the migration files in this repo are not a fully
-- reliable record of live RLS state on their own; treat pg_policies output
-- as ground truth over migration history when auditing other tables.

DROP POLICY IF EXISTS "profiles_public" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles insertable by user" ON profiles;
DROP POLICY IF EXISTS "Profiles readable by user" ON profiles;
DROP POLICY IF EXISTS "Profiles updatable by user" ON profiles;

-- =====================================================================
-- ROLLBACK NOTES
--
-- There is no safe rollback for this migration. Re-creating
-- "profiles_public" (USING (true), role public) would restore
-- unconditional read access to every profile row for anyone, including
-- unauthenticated requests -- exactly the exposure this migration and 039
-- both exist to close. If profiles_owner_select / profiles_admin_select
-- (from 039) ever need to be rolled back, roll back 039 as a whole and
-- treat re-adding any of the five policies dropped here as a new,
-- deliberate decision, not a rollback.
-- =====================================================================
