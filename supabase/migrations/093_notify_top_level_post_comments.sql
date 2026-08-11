-- Extends comments_notify_new_reply (migration 091) to also fire for a
-- brand-new, top-level comment on a post (not just a reply to another
-- comment) -- "someone replied to your post" is now a real, named
-- notification ("Marcus replied to your post"), giving members a
-- concrete social reason to come back. Previously only reply-to-a-
-- comment was covered at all; a first comment directly on a member's
-- post produced no notification of any kind.
--
-- Removes migration 091's WHEN (parent_comment_id IS NOT NULL) clause
-- so the trigger now fires on every comment insert. The webhook route
-- (app/api/webhooks/new-comment-reply/route.ts) already branches on
-- whether parent_comment_id is null: null -> notify the post's author;
-- set -> the existing reply-notification logic, unchanged. No change to
-- notify_new_comment_reply() itself -- it already passes
-- parent_comment_id through as-is (null or not).

DROP TRIGGER IF EXISTS comments_notify_new_reply ON comments;
CREATE TRIGGER comments_notify_new_reply
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_comment_reply();

-- =====================================================================
-- ROLLBACK NOTES
--
-- DROP TRIGGER IF EXISTS comments_notify_new_reply ON comments;
-- CREATE TRIGGER comments_notify_new_reply
--   AFTER INSERT ON comments
--   FOR EACH ROW
--   WHEN (NEW.parent_comment_id IS NOT NULL)
--   EXECUTE FUNCTION notify_new_comment_reply();
--
-- Restores migration 091's original reply-only trigger. Does not modify
-- migrations 001-092.
-- =====================================================================
