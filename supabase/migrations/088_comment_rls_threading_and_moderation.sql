-- RLS updates to support reply threading (migration 087) safely and to
-- let moderators soft-delete a comment that has live replies.
--
-- Note on scope: comments_admin_delete (migration 052) already lets an
-- admin (is_profile_admin()) hard-DELETE any comment -- that part of
-- moderation already works and is untouched here. What's missing is an
-- admin UPDATE policy, needed for the new soft-delete path (deleted_at +
-- cleared body) so a moderator can remove a comment that has replies
-- without losing those replies. The one existing UPDATE policy scoped to
-- admins (comments_update_themes_admin, migration 028) checks
-- auth.jwt() ->> 'role' = 'admin' -- a JWT custom claim this app never
-- actually sets (every other admin check in this codebase reads
-- profiles.role via is_profile_admin()/requireAdmin()), so it's
-- effectively dead and not relied on here.
--
-- Also tightens comment INSERT: a reply's parent_comment_id must
-- reference a real, non-deleted comment on the SAME post -- enforced in
-- the database via WITH CHECK, not just trusted from the client, so a
-- crafted request can't attach a reply to a comment on a different post
-- or to an already-removed comment.
--
-- Deliberately NOT in scope here: SELECT on posts/comments is still not
-- scoped to space membership (migration 075's known, separately-flagged
-- gap -- see that migration's rollback notes, which explicitly say any
-- fix should be its own narrowly-scoped policy). The new post-detail
-- deep-link page enforces space-membership at the application layer
-- instead. Mixing that fix into this migration would risk unrelated
-- regressions and isn't needed for threading/moderation to work
-- correctly.

DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "comments_insert_own_and_valid_parent"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      parent_comment_id IS NULL
      OR EXISTS (
        SELECT 1 FROM comments p
        WHERE p.id = parent_comment_id
          AND p.post_id = comments.post_id
          AND p.deleted_at IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "comments_admin_update" ON comments;
CREATE POLICY "comments_admin_update"
  ON comments FOR UPDATE
  TO authenticated
  USING (is_profile_admin(auth.uid()))
  WITH CHECK (is_profile_admin(auth.uid()));

-- =====================================================================
-- ROLLBACK NOTES
--
-- DROP POLICY IF EXISTS "comments_admin_update" ON comments;
-- DROP POLICY IF EXISTS "comments_insert_own_and_valid_parent" ON comments;
-- CREATE POLICY "Users can create comments"
--   ON comments FOR INSERT
--   TO authenticated
--   WITH CHECK (user_id = auth.uid());
--
-- Restores the original migration-001 INSERT policy (no parent
-- validation) and removes the admin UPDATE policy. Does not touch
-- migrations 001-086.
-- =====================================================================
