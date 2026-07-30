-- 082: Email a recipient when they receive a new async Guided Connection
-- invitation. Confirmed gap: no notification of any kind was ever sent
-- when create_connection_invitation() (migration 078) creates a row --
-- only the legacy live-chat flow emails, and only on a connection's first
-- message (migration 077).
--
-- Same pattern as notify_new_connection_message() (migration 077) and
-- notify_new_post() (migration 054): an AFTER INSERT trigger fires an
-- async, non-blocking pg_net HTTP call to a Next.js API route, which does
-- the actual lookup + email send in TypeScript. Only fires for new async
-- invitations (connection_type = 'async' AND status = 'awaiting_acceptance')
-- -- legacy live connections are inserted directly as 'confirmed' by
-- createConfirmedConnection() and were never in scope for this.

CREATE OR REPLACE FUNCTION notify_new_connection_invitation() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.connection_type = 'async' AND NEW.status = 'awaiting_acceptance' THEN
    PERFORM net.http_post(
      url := 'https://community.trevorjamesla.com/api/webhooks/new-connection-invitation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer REPLACE_WITH_POST_NOTIFICATION_WEBHOOK_SECRET'
      ),
      body := jsonb_build_object(
        'connectionId', NEW.id,
        'fromUserId', NEW.user_id,
        'toUserId', NEW.partner_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS connections_notify_new_invitation ON connections;
CREATE TRIGGER connections_notify_new_invitation
  AFTER INSERT ON connections
  FOR EACH ROW EXECUTE FUNCTION notify_new_connection_invitation();

-- =====================================================================
-- MANUAL STEP REQUIRED BEFORE THIS TRIGGER IS SAFE TO LEAVE ENABLED:
-- Replace 'REPLACE_WITH_POST_NOTIFICATION_WEBHOOK_SECRET' above with the
-- SAME value already set for POST_NOTIFICATION_WEBHOOK_SECRET in Vercel's
-- environment variables (the exact same secret notify_new_connection_message()
-- and notify_new_post() already use), then re-run just this
-- CREATE OR REPLACE FUNCTION statement. Until that's done, the webhook
-- call will 401 and fail silently (pg_net logs the failed response in
-- net._http_response, it does not raise an error back into the INSERT).
-- =====================================================================

-- =====================================================================
-- ROLLBACK NOTES
--
-- DROP TRIGGER IF EXISTS connections_notify_new_invitation ON connections;
-- DROP FUNCTION IF EXISTS notify_new_connection_invitation();
--
-- Does not touch any existing RLS policy, does not modify prior migrations.
-- =====================================================================
