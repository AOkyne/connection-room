-- Emails a member when someone replies to their comment (or replies
-- within a thread they started). No such notification exists today for
-- comments at all -- fully greenfield, following the exact established
-- pattern already used for new posts (migration 054) and connection
-- messages/invitations (migrations 077, 082): an AFTER INSERT trigger
-- fires an async, non-blocking pg_net HTTP call to a Next.js API route,
-- which does the actual lookup + email send in TypeScript.
--
-- Only fires for replies (parent_comment_id IS NOT NULL) -- brand new
-- top-level comments on a post are not covered by this migration (no
-- "someone commented on your post" notification exists or is being
-- added here; item 4 of the feature spec only asks for reply
-- notifications).

-- =====================================================================
-- 1. Dedup/bookkeeping table. A dedicated table rather than reusing
-- notification_log (054, post-shaped) or connection_notification_log
-- (077, connection-shaped) -- neither's columns fit a comment-reply
-- notification. Internal bookkeeping only -- service-role access via the
-- webhook route, no member-facing policies.
-- =====================================================================

CREATE TABLE IF NOT EXISTS comment_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  notified_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevents double-emailing the same recipient for the same reply if the
-- webhook is ever retried (pg_net delivers at-least-once).
CREATE UNIQUE INDEX IF NOT EXISTS comment_notification_log_dedup_idx
  ON comment_notification_log (comment_id, notified_user_id);

ALTER TABLE comment_notification_log ENABLE ROW LEVEL SECURITY;
-- No policies created -- RLS defaults to deny for every role except
-- service_role (which bypasses RLS entirely). Only the webhook route
-- uses this table.

-- =====================================================================
-- 2. Trigger: fire an async webhook call on every new reply. The webhook
-- route resolves both the direct reply target (the parent comment's
-- author) and, if different, the thread-root author ("replies within a
-- thread you started"), dedupes them against each other and against
-- comment_notification_log, and checks profiles.notification_frequency
-- before sending -- none of that lookup logic belongs in SQL, so this
-- trigger just hands off the raw ids.
-- =====================================================================

CREATE OR REPLACE FUNCTION notify_new_comment_reply() RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://community.trevorjamesla.com/api/webhooks/new-comment-reply',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer REPLACE_WITH_POST_NOTIFICATION_WEBHOOK_SECRET'
    ),
    body := jsonb_build_object(
      'commentId', NEW.id,
      'parentCommentId', NEW.parent_comment_id,
      'rootCommentId', NEW.root_comment_id,
      'postId', NEW.post_id,
      'replierId', NEW.user_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS comments_notify_new_reply ON comments;
CREATE TRIGGER comments_notify_new_reply
  AFTER INSERT ON comments
  FOR EACH ROW
  WHEN (NEW.parent_comment_id IS NOT NULL)
  EXECUTE FUNCTION notify_new_comment_reply();

-- =====================================================================
-- MANUAL STEP REQUIRED BEFORE THIS TRIGGER IS SAFE TO LEAVE ENABLED:
-- Replace 'REPLACE_WITH_POST_NOTIFICATION_WEBHOOK_SECRET' above with the
-- SAME value already set for POST_NOTIFICATION_WEBHOOK_SECRET in
-- Vercel's environment variables (the exact same secret
-- notify_new_post()/notify_new_connection_message()/
-- notify_new_connection_invitation() already use), then re-run just this
-- CREATE OR REPLACE FUNCTION statement. Until that's done, the webhook
-- call will 401 and fail silently (pg_net logs the failed response in
-- net._http_response, it does not raise an error back into the comments
-- INSERT).
-- =====================================================================

-- =====================================================================
-- ROLLBACK NOTES
--
-- DROP TRIGGER IF EXISTS comments_notify_new_reply ON comments;
-- DROP FUNCTION IF EXISTS notify_new_comment_reply();
-- DROP TABLE IF EXISTS comment_notification_log;
--
-- Does not touch any existing RLS policy and does not modify migrations
-- 001-090.
-- =====================================================================
