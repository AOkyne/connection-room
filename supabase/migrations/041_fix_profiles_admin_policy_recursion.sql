-- CRITICAL FIX for a bug introduced by 039.
--
-- 039's profiles_admin_select / profiles_admin_update policies used:
--
--   EXISTS (SELECT 1 FROM profiles admin_row
--           WHERE admin_row.user_id = auth.uid() AND admin_row.role = 'admin')
--
-- This is a policy ON profiles whose own USING clause queries profiles.
-- That inner SELECT is itself subject to every RLS policy on profiles,
-- including this same one -- so evaluating it re-triggers itself, forever.
-- Postgres detects this and errors instead of hanging:
--
--   42P17: infinite recursion detected in policy for relation "profiles"
--
-- The practical effect: EVERY query against profiles has been failing
-- since 039 was applied, for every caller, including a user reading their
-- own row via profiles_owner_select -- Postgres evaluates all applicable
-- permissive policies together, and one recursing poisons the whole query
-- regardless of whether another policy alone would have allowed it. This
-- was caught during live two-account verification testing: a freshly
-- signed-in user's own profile page silently fell back to a generic
-- "Guest User" placeholder because the underlying query was erroring out
-- and being swallowed by existing timeout/fallback handling, masking the
-- real cause.
--
-- Fix: use is_admin(auth.uid()) instead of a self-referencing subquery.
-- is_admin() is a live database function (no corresponding migration file
-- in this repo -- see 040's comment on undocumented live objects) already
-- used successfully by several pre-existing policies on other tables
-- ("Admins can view all posts", "Admins can view all comments", etc.)
-- without recursion problems, which only works if it queries profiles in a
-- way that bypasses profiles' own RLS (almost certainly SECURITY DEFINER).
-- Reusing it here sidesteps the self-reference entirely instead of trying
-- to hand-roll a second admin-check mechanism.
--
-- public_profiles_admin_select / public_profiles_admin_update are also
-- switched to is_admin() for the same reason: their subquery reads from
-- profiles, which was transitively hitting the same broken policy.

DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
CREATE POLICY "profiles_admin_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
CREATE POLICY "profiles_admin_update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "public_profiles_admin_select" ON public_profiles;
CREATE POLICY "public_profiles_admin_select"
  ON public_profiles FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "public_profiles_admin_update" ON public_profiles;
CREATE POLICY "public_profiles_admin_update"
  ON public_profiles FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- =====================================================================
-- ROLLBACK NOTES
--
-- Rolling this back means reverting to the self-referencing EXISTS
-- subquery from 039, which is the exact bug this migration fixes -- do
-- not roll this back. If is_admin() itself is ever found to be wrong or
-- removed, replace these four policies with a SECURITY DEFINER function
-- defined in a new migration, not with a subquery against profiles
-- directly (that is what caused this bug in the first place).
-- =====================================================================
