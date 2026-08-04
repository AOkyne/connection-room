-- Adds reply threading and soft-delete to comments, so a Question of the
-- Week post (and any other post) can support: reply to the post itself
-- (top-level comment, unchanged), reply to a top-level comment, and reply
-- to an existing reply -- while keeping the rendered thread to exactly 2
-- visual levels (see root_comment_id below).
--
-- parent_comment_id = the comment being *directly* replied to (may itself
-- be a top-level comment or a reply). root_comment_id = the top-level
-- ancestor of the whole thread (NULL for top-level comments). Replying to
-- a reply sets parent_comment_id to that reply's id but root_comment_id
-- to the SAME root as the reply being replied to -- computed
-- application-side at insert time (lib/data/supabase-posts.ts), not by a
-- trigger, matching this repo's general preference for TS-side logic
-- outside of the notification-fanout trigger pattern. This lets the
-- client group all comments by COALESCE(root_comment_id, id) and render
-- everything in a group with parent_comment_id IS NOT NULL at a single
-- reply indent level, regardless of how deep the actual reply chain is.
--
-- deleted_at supports "This comment has been removed." placeholders: a
-- comment with live replies is soft-deleted (deleted_at set, body
-- cleared) instead of hard-deleted, so those replies survive. A leaf
-- comment with no replies keeps today's hard-DELETE behavior unchanged
-- (see lib/data/posts.ts deleteComment()).

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS root_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ON DELETE SET NULL (not CASCADE) on both FKs: a hard-deleted comment
-- must never silently vaporize live replies underneath it. In practice
-- deleteComment() now avoids hard-deleting any comment with children at
-- all (see above), so this is a defense-in-depth backstop, not the
-- primary mechanism.

CREATE INDEX IF NOT EXISTS comments_parent_comment_id_idx ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS comments_root_comment_id_idx ON comments(root_comment_id);
CREATE INDEX IF NOT EXISTS comments_post_id_created_at_idx ON comments(post_id, created_at);

-- =====================================================================
-- ROLLBACK NOTES
--
-- ALTER TABLE comments
--   DROP COLUMN IF EXISTS parent_comment_id,
--   DROP COLUMN IF EXISTS root_comment_id,
--   DROP COLUMN IF EXISTS deleted_at,
--   DROP COLUMN IF EXISTS updated_at;
--
-- All four columns are nullable/defaulted additions -- existing flat
-- comments are unaffected (parent_comment_id/root_comment_id NULL means
-- "top-level", exactly as before this migration). No data loss on
-- rollback since nothing pre-existing depends on these columns.
-- =====================================================================
