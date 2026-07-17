-- posts/comments DELETE RLS only ever allowed the post/comment's own
-- author (user_id = auth.uid()), with no admin override. Since Postgres
-- RLS silently filters a DELETE to zero matching rows rather than raising
-- an error, an admin deleting someone else's post via the Moderation page
-- or the space page's admin "Delete" button looked like it succeeded (no
-- error thrown) but nothing was actually removed -- the post/comment
-- reappeared on the next fetch. Adds an admin-bypass policy, same pattern
-- as migration 044's is_profile_admin() (dedicated, non-inlinable, safe to
-- use in a policy on a table it doesn't itself query).

DROP POLICY IF EXISTS "posts_admin_delete" ON posts;
CREATE POLICY "posts_admin_delete"
  ON posts FOR DELETE
  TO authenticated
  USING (is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "comments_admin_delete" ON comments;
CREATE POLICY "comments_admin_delete"
  ON comments FOR DELETE
  TO authenticated
  USING (is_profile_admin(auth.uid()));
