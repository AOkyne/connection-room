-- 086: Remove the instant-fire emails from submit_round_response() and
-- submit_acknowledgment() (migration 083) -- firing the moment the other
-- side acts meant someone actively still in the app, about to open the
-- reveal themselves, could get an email about something they were already
-- looking at. Requested: only email if the recipient genuinely hasn't
-- responded within a grace window (10 minutes), not immediately.
--
-- The actual delayed check now lives in
-- app/api/cron/connections-expiry/route.ts, which already runs on a
-- schedule and already has the dedup infrastructure
-- (connection_notification_log) this needs -- see that file for the
-- "has it been 10+ minutes and still unread" logic. This migration only
-- removes the two net.http_post calls; every other line of these
-- functions is unchanged from migration 083.

CREATE OR REPLACE FUNCTION submit_round_response(p_round_id UUID, p_text TEXT) RETURNS TEXT AS $$
DECLARE
  v_participant_id UUID;
  v_connection_id UUID;
  v_deadline TIMESTAMPTZ;
  v_status TEXT;
  v_submitted_count INT;
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
  v_connection_id UUID;
BEGIN
  SELECT cr.connection_id INTO v_connection_id FROM connection_rounds cr WHERE cr.id = p_round_id;

  SELECT id INTO v_from_id FROM connection_participants
  WHERE connection_id = v_connection_id AND user_id = auth.uid();

  IF v_from_id IS NULL THEN
    RAISE EXCEPTION 'Not a participant in this round';
  END IF;

  SELECT id INTO v_to_id FROM connection_participants
  WHERE connection_id = v_connection_id AND id != v_from_id;

  INSERT INTO connection_acknowledgments (connection_round_id, from_participant_id, to_participant_id, acknowledgment_type, acknowledgment_text)
  VALUES (p_round_id, v_from_id, v_to_id, p_acknowledgment_type, p_acknowledgment_text)
  ON CONFLICT (connection_round_id, from_participant_id) DO UPDATE
    SET acknowledgment_type = EXCLUDED.acknowledgment_type, acknowledgment_text = EXCLUDED.acknowledgment_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================================
-- ROLLBACK NOTES
--
-- This only redefines these two function bodies (CREATE OR REPLACE), no
-- schema changes. Reverting to the migration 083 versions restores the
-- instant-fire emails.
-- =====================================================================
