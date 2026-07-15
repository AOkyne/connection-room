-- 041 switched profiles_admin_select/profiles_admin_update from a
-- self-referencing EXISTS subquery (infinite recursion, 42P17) to
-- is_admin(auth.uid()) -- a pre-existing, undocumented function already
-- used successfully by unrelated policies on posts/comments. That did not
-- fix it either: the identical 42702 "ambiguous column" error persisted,
-- and testing showed it happens on ANY write to profiles (plain UPDATE,
-- not just upsert), and persisted even after 043 rewrote this migration's
-- own trigger to use fully-parameterized dynamic SQL -- ruling out this
-- migration's trigger as the cause entirely.
--
-- The remaining explanation: is_admin() itself queries profiles. When a
-- policy ON profiles calls is_admin(), and is_admin() is a SQL-language
-- (not plpgsql) function, Postgres's planner can inline its body directly
-- into the outer query plan. If is_admin()'s own internal query references
-- profiles.user_id without table-qualifying it, inlining that into a query
-- that is *also* querying profiles creates a genuine ambiguity -- the
-- planner can no longer tell whether "user_id" in the inlined body means
-- the outer query's profiles row or the function's own. This is a known
-- Postgres pitfall specific to using a same-table-querying helper function
-- inside an RLS policy on that same table -- it's why is_admin() has
-- apparently worked fine on posts/comments (no table overlap) but not on
-- profiles/public_profiles (direct overlap). is_admin()'s own definition
-- is not touched here -- it has no corresponding migration file and its
-- full contract/dependents are unknown; changing it risks breaking the
-- other policies that already rely on it successfully.
--
-- Fix: a dedicated function, LANGUAGE plpgsql specifically (plpgsql
-- functions are opaque to the planner and are never inlined, which is
-- also what made 041's approach safe from infinite recursion), with a
-- parameter name that cannot collide with any column name, and fully
-- table-qualified column references throughout.

CREATE OR REPLACE FUNCTION is_profile_admin(check_auth_uid uuid) RETURNS boolean AS $$
DECLARE
  result boolean;
BEGIN
  SELECT (profiles.role = 'admin') INTO result
  FROM profiles
  WHERE profiles.user_id = check_auth_uid
  LIMIT 1;

  RETURN COALESCE(result, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
CREATE POLICY "profiles_admin_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
CREATE POLICY "profiles_admin_update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "public_profiles_admin_select" ON public_profiles;
CREATE POLICY "public_profiles_admin_select"
  ON public_profiles FOR SELECT
  TO authenticated
  USING (is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "public_profiles_admin_update" ON public_profiles;
CREATE POLICY "public_profiles_admin_update"
  ON public_profiles FOR UPDATE
  TO authenticated
  USING (is_profile_admin(auth.uid()));

-- =====================================================================
-- ROLLBACK NOTES
--
-- Rolling back means reverting to is_admin(auth.uid()) for these four
-- policies, which reproduces the 42702 ambiguous-column error this
-- migration fixes -- do not roll this back. is_profile_admin() is new and
-- only used by these four policies; dropping it along with a rollback is
-- safe as long as these policies are reverted in the same step.
-- =====================================================================
