-- posts/comments/reactions currently each have THREE separate SELECT
-- policies stacked up from different migrations over time (001, 009,
-- 028) -- Postgres RLS OR's multiple policies together, and two of the
-- three on each table have no `TO` clause (defaults to `public`, i.e.
-- anon too). The result: anyone with just the public anon key can read
-- every member's posts/comments/reactions with zero login, in what's
-- meant to be a private, members-only community. Found while
-- investigating an unrelated Supabase Security Advisor alert on
-- `articles` (074_enable_rls_articles.sql) and confirmed live via the
-- anon key returning real post/comment/reaction rows.
--
-- Fix: drop all the redundant/public SELECT policies on each table and
-- replace with a single `TO authenticated USING (true)` policy. This
-- only tightens SELECT -- INSERT/UPDATE/DELETE policies (owner-only,
-- with admin overrides on posts/comments) are untouched, still correct,
-- and not part of this migration.
--
-- reactions: a blanket authenticated-only policy (not scoped to
-- `user_id = auth.uid()`) is correct here, not an oversight -- the app
-- aggregates reaction counts across ALL users' reactions on a post
-- (lib/data/supabase-posts.ts), so scoping SELECT to the viewer's own
-- reactions would break reaction counts for every post.
--
-- Known edge case (not fixed here): a narrow auth-failure fallback path
-- (lib/auth/fallback.ts + createMemberSession in app/auth/page.tsx) can
-- leave the app-level UI believing a user is "signed in" via a
-- localStorage-only session with no real Supabase JWT. Under this
-- migration such a user's Supabase client calls go out as `anon` and
-- RLS will silently return zero rows (not an error) for posts/comments/
-- reactions -- previously masked by the public-read policies. This is a
-- pre-existing fallback-auth gap, not something this migration
-- introduces; flagged for a separate fix, not blocking this one.

-- posts
DROP POLICY IF EXISTS "Posts are readable by authenticated users" ON posts;
DROP POLICY IF EXISTS "posts_public_read" ON posts;
DROP POLICY IF EXISTS "posts_read_with_themes" ON posts;
CREATE POLICY "posts_select_authenticated"
  ON posts FOR SELECT
  TO authenticated
  USING (true);

-- comments
DROP POLICY IF EXISTS "Comments are readable by authenticated users" ON comments;
DROP POLICY IF EXISTS "comments_public_read" ON comments;
DROP POLICY IF EXISTS "comments_read_with_themes" ON comments;
CREATE POLICY "comments_select_authenticated"
  ON comments FOR SELECT
  TO authenticated
  USING (true);

-- reactions
DROP POLICY IF EXISTS "Reactions are readable by authenticated users" ON reactions;
DROP POLICY IF EXISTS "reactions_public_read" ON reactions;
CREATE POLICY "reactions_select_authenticated"
  ON reactions FOR SELECT
  TO authenticated
  USING (true);

-- ROLLBACK NOTES
-- Re-creating any of the dropped public-read policies (posts_public_read,
-- comments_public_read, reactions_public_read, posts_read_with_themes,
-- comments_read_with_themes, or the original 001 "readable by
-- authenticated users" ones under their old names) would restore
-- unauthenticated read access to private member content -- do not do
-- this. If a genuinely public preview of *some* posts is ever wanted,
-- that should be a new, narrowly-scoped policy (e.g. a specific
-- "featured" flag), not a blanket USING (true) reachable by anon.
