-- Connection-chat notifications.
--
-- Connections has no presence/online tracking at all (no last_seen_at, no
-- realtime status) -- so "the other person isn't immediately available"
-- is approximated as "this is the first message in a brand-new chat they
-- haven't seen yet". Only the FIRST message of a connection ever triggers
-- an email (enforced in the webhook route, by counting existing messages
-- for the connection); every message after that is a live back-and-forth
-- the recipient is presumably already part of.
--
-- ARCHITECTURE: sendMessage() (lib/data/messages.ts) writes directly from
-- the browser via the anon key -- there is no server-side "send message"
-- route to hook an email into. Mirrors the exact pattern already used for
-- new-post notifications (migration 054, posts_notify_new_post): a
-- trigger fires an async, non-blocking pg_net HTTP call to a Next.js API
-- route, which does the actual lookup + email send in TypeScript.

-- =====================================================================
-- 1. Dedup/bookkeeping table. A dedicated table rather than reusing
-- notification_log (migration 054) -- that table's post_id column FKs to
-- posts and its notification_type CHECK constraint only allows
-- 'immediate'/'daily'/'weekly', neither of which fits a connection
-- notification. Internal bookkeeping only -- no member ever needs to
-- read this directly, so RLS is enabled with no member-facing policies
-- (service-role access only, used by the webhook route below).
-- =====================================================================

CREATE TABLE IF NOT EXISTS connection_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  notified_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevents double-emailing the same recipient for the same connection if
-- the webhook is ever retried (pg_net delivers at-least-once) or if two
-- messages race each other before the first one's email finishes sending.
CREATE UNIQUE INDEX IF NOT EXISTS connection_notification_log_dedup_idx
  ON connection_notification_log (connection_id, notified_user_id);

ALTER TABLE connection_notification_log ENABLE ROW LEVEL SECURITY;
-- No policies created -- RLS defaults to deny for every role except
-- service_role (which bypasses RLS entirely). Only the webhook route uses
-- this table, via the service-role key.

-- =====================================================================
-- 2. Trigger: fire an async webhook call on every new connection message,
-- so the webhook route can decide (by counting existing messages) whether
-- this is the first message in the chat and, if so, email the recipient.
-- pg_net queues the request and returns immediately -- this does not
-- block or slow down the message INSERT.
--
-- Same pragmatic hardcoded-literal style as notify_new_post() in
-- migration 054 -- Postgres has no access to Vercel's env vars, so the
-- webhook URL and secret are baked into the function body. Reuses
-- POST_NOTIFICATION_WEBHOOK_SECRET (already configured in Vercel) rather
-- than introducing a new secret -- both this and new-post-notification
-- are the same trust boundary ("Postgres calling out to our own API"),
-- distinct from CRON_SECRET's "external service calling in".
-- =====================================================================

CREATE OR REPLACE FUNCTION notify_new_connection_message() RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://community.trevorjamesla.com/api/webhooks/new-connection-message',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer REPLACE_WITH_POST_NOTIFICATION_WEBHOOK_SECRET'
    ),
    body := jsonb_build_object(
      'connectionId', NEW.connection_id,
      'messageId', NEW.id,
      'fromUserId', NEW.from_user_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS connection_messages_notify_new_message ON connection_messages;
CREATE TRIGGER connection_messages_notify_new_message
  AFTER INSERT ON connection_messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_connection_message();

-- =====================================================================
-- MANUAL STEP REQUIRED BEFORE THIS TRIGGER IS SAFE TO LEAVE ENABLED:
-- Replace 'REPLACE_WITH_POST_NOTIFICATION_WEBHOOK_SECRET' above with the
-- SAME value already set for POST_NOTIFICATION_WEBHOOK_SECRET in Vercel's
-- environment variables (the exact same secret notify_new_post() in
-- migration 054 uses), then re-run just this CREATE OR REPLACE FUNCTION
-- statement. Until that's done, the webhook call will 401 and simply fail
-- silently (pg_net logs the failed response in net._http_response, it
-- does not raise an error back into the connection_messages INSERT).
-- =====================================================================

-- =====================================================================
-- ROLLBACK NOTES
--
-- To revert this migration:
--   DROP TRIGGER IF EXISTS connection_messages_notify_new_message ON connection_messages;
--   DROP FUNCTION IF EXISTS notify_new_connection_message();
--   DROP TABLE IF EXISTS connection_notification_log;
--
-- This migration does not touch any existing RLS policy and does not
-- modify migrations 001-076.
-- =====================================================================
