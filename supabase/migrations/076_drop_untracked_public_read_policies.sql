-- Follow-up to 075: that migration dropped every public-read SELECT
-- policy this repo's migration history knew about, but a live check via
-- the Supabase dashboard's Policies view revealed a second, larger set
-- of policies on posts/comments/reactions that were created directly in
-- the dashboard/SQL editor at some point and never captured in any
-- migration file here -- so 075 didn't know to drop them, and
-- unauthenticated reads kept working anyway. Confirmed by name/command/
-- role directly from the live dashboard (not guessed):
--
--   posts:     "Admins can view all posts" (SELECT, public)
--              "Posts readable"            (SELECT, public)
--              "posts_public"              (SELECT, public)
--   comments:  "Admins can view all comments" (SELECT, public)
--              "Comments readable"            (SELECT, public)
--              "comments_public"              (SELECT, public)
--   reactions: "Reactions readable"  (SELECT, public)
--              "reactions_public"    (SELECT, public)
--
-- ("Admins can view all posts/comments" being scoped to `public` rather
-- than admin-only is itself a naming lie -- the policy name suggests an
-- admin check, but the "Applied to" role is public, so it grants
-- everyone read access regardless of role, not just admins.)
--
-- Sibling INSERT/UPDATE/DELETE policies with the same "{Table}
-- insertable/updatable/deletable" naming pattern (also role: public in
-- the dashboard) were live-tested with disposable rows and confirmed
-- NOT exploitable -- despite the misleading "public" role label, their
-- actual USING/WITH CHECK clauses still require auth.uid() to match the
-- row's owner, so anon requests (auth.uid() IS NULL) can never match
-- any row. Only the SELECT policies were unconditionally open. This
-- migration therefore only touches SELECT, consistent with 075.

-- posts
DROP POLICY IF EXISTS "Admins can view all posts" ON posts;
DROP POLICY IF EXISTS "Posts readable" ON posts;
DROP POLICY IF EXISTS "posts_public" ON posts;

-- comments
DROP POLICY IF EXISTS "Admins can view all comments" ON comments;
DROP POLICY IF EXISTS "Comments readable" ON comments;
DROP POLICY IF EXISTS "comments_public" ON comments;

-- reactions
DROP POLICY IF EXISTS "Reactions readable" ON reactions;
DROP POLICY IF EXISTS "reactions_public" ON reactions;

-- Each table is left with exactly one SELECT policy after this:
-- {table}_select_authenticated (TO authenticated USING (true)), created
-- in 075. Admins already read posts/comments/reactions fine through
-- that same authenticated policy since is_profile_admin() is not needed
-- for read access -- admin-specific SELECT scoping was never actually
-- required here, only for write overrides (posts_admin_delete,
-- comments_admin_delete), which are untouched.
--
-- ROLLBACK NOTES: do not re-create any of the eight policies dropped
-- above -- every one of them was an unconditional public SELECT with no
-- ownership or auth check, restoring unauthenticated read access to
-- private member content.
