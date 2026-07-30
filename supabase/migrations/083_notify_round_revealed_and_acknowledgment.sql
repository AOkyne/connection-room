-- 083: Real-time email notifications for the two async guided-connection
-- events that most resemble "getting a message": a round revealing (your
-- connection just answered, so you can both see each other's responses
-- now) and receiving an acknowledgment. Previously the only emails in
-- this feature were the scheduled reminder pass (connections-expiry cron,
-- every 15-30 min) and the invitation-created email (migration 082) --
-- nothing fired the moment something actually happened.
--
-- Same pg_net fire-and-forget pattern as every other trigger-driven
-- notification in this app, except these two fire directly from inside
-- the existing RPCs (submit_round_response / submit_acknowledgment)
-- rather than a separate AFTER INSERT/UPDATE trigger -- these RPCs are
-- the only place that ever performs these transitions, and they already
-- know exactly which participant to notify (the one who did NOT just
-- call the function, i.e. the one who's been waiting -- the caller is,
-- by definition, online right now). No real presence tracking exists in
-- this app (same limitation as every other notification here), so "unless
-- they're online and respond immediately" is approximated the same way
-- the legacy chat notification approximates it: only the side that isn't
-- actively taking the action gets emailed.

CREATE OR REPLACE FUNCTION submit_round_response(p_round_id UUID, p_text TEXT) RETURNS TEXT AS $$
DECLARE
  v_participant_id UUID;
  v_connection_id UUID;
  v_deadline TIMESTAMPTZ;
  v_status TEXT;
  v_submitted_count INT;
  v_other_user_id UUID;
BEGIN
  SELECT cp.id, cp.connection_id INTO v_participant_id, v_connection_id
  FROM connection_participants cp
  JOIN connection_rounds cr ON cr.connection_id = cp.connection_id
  WHERE cr.id = p_round_id AND cp.user_id = auth.uid();

  IF v_participant_id IS NULL THEN
    RAISE EXCEPTION 'Not a participant in this round';
  END IF;

  SELECT status, response_deadline_at INTO v_status, v_deadline
  FROM connection_rounds WHERE id = p_round_id FOR UPDATE;

  IF v_status != 'open' THEN
    RAISE EXCEPTION 'This round is no longer open';
  END IF;

  IF v_deadline < NOW() THEN
    RAISE EXCEPTION 'The response window for this round has closed';
  END IF;

  UPDATE connection_responses
  SET submitted_text = p_text, submitted_at = NOW(), draft_text = NULL
  WHERE connection_round_id = p_round_id AND participant_id = v_participant_id AND submitted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A response has already been submitted for this round';
  END IF;

  SELECT COUNT(*) INTO v_submitted_count
  FROM connection_responses WHERE connection_round_id = p_round_id AND submitted_at IS NOT NULL;

  IF v_submitted_count = 2 THEN
    UPDATE connection_rounds SET status = 'revealed', revealed_at = NOW() WHERE id = p_round_id;
    UPDATE connection_responses SET revealed_at = NOW() WHERE connection_round_id = p_round_id;

    SELECT user_id INTO v_other_user_id
    FROM connection_participants
    WHERE connection_id = v_connection_id AND id != v_participant_id;

    IF v_other_user_id IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://community.trevorjamesla.com/api/webhooks/connection-round-revealed',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer REPLACE_WITH_POST_NOTIFICATION_WEBHOOK_SECRET'
        ),
        body := jsonb_build_object(
          'roundId', p_round_id,
          'connectionId', v_connection_id,
          'notifyUserId', v_other_user_id
        )
      );
    END IF;

    RETURN 'revealed';
  END IF;

  RETURN 'waiting_for_participant';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION submit_acknowledgment(
  p_round_id UUID,
  p_acknowledgment_type TEXT,
  p_acknowledgment_text TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_from_id UUID;
  v_to_id UUID;
  v_to_user_id UUID;
  v_connection_id UUID;
BEGIN
  SELECT cr.connection_id INTO v_connection_id FROM connection_rounds cr WHERE cr.id = p_round_id;

  SELECT id INTO v_from_id FROM connection_participants
  WHERE connection_id = v_connection_id AND user_id = auth.uid();

  IF v_from_id IS NULL THEN
    RAISE EXCEPTION 'Not a participant in this round';
  END IF;

  SELECT id, user_id INTO v_to_id, v_to_user_id FROM connection_participants
  WHERE connection_id = v_connection_id AND id != v_from_id;

  INSERT INTO connection_acknowledgments (connection_round_id, from_participant_id, to_participant_id, acknowledgment_type, acknowledgment_text)
  VALUES (p_round_id, v_from_id, v_to_id, p_acknowledgment_type, p_acknowledgment_text)
  ON CONFLICT (connection_round_id, from_participant_id) DO UPDATE
    SET acknowledgment_type = EXCLUDED.acknowledgment_type, acknowledgment_text = EXCLUDED.acknowledgment_text;

  IF v_to_user_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://community.trevorjamesla.com/api/webhooks/connection-acknowledgment',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer REPLACE_WITH_POST_NOTIFICATION_WEBHOOK_SECRET'
      ),
      body := jsonb_build_object(
        'roundId', p_round_id,
        'connectionId', v_connection_id,
        'notifyUserId', v_to_user_id,
        'fromUserId', auth.uid()
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================================
-- MANUAL STEP REQUIRED BEFORE THESE ARE SAFE TO LEAVE ENABLED:
-- Replace both 'REPLACE_WITH_POST_NOTIFICATION_WEBHOOK_SECRET' occurrences
-- above with the same real POST_NOTIFICATION_WEBHOOK_SECRET value already
-- used by every other webhook-calling trigger/function in this app, then
-- re-run just these two CREATE OR REPLACE FUNCTION statements. Until then
-- both webhook calls will 401 and fail silently (pg_net logs the failed
-- response in net._http_response, it does not raise an error back into
-- the calling RPC).
-- =====================================================================

-- =====================================================================
-- ROLLBACK NOTES
--
-- This only redefines these two function bodies (CREATE OR REPLACE), no
-- schema changes. Reverting to the migration 078 versions (no webhook
-- calls) restores the "no notification at all" gap this migration closes.
-- =====================================================================
