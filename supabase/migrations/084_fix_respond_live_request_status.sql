-- 084: Fix respond_live_request() unconditionally jumping to
-- 'exchange_complete' on decline/continue_async.
--
-- The live-conversation upsell can be offered as soon as round 1
-- completes (by design -- and now also fixed on the client to actually
-- only appear then, see app/app/connections/[id]/page.tsx's
-- canOfferLive). But this function hardcoded the fallback status to
-- 'exchange_complete' regardless of how many rounds were actually left --
-- so declining a live request (or choosing "Continue asynchronously
-- instead") after round 1 would prematurely mark the ENTIRE guided
-- exchange as complete, skipping rounds 2 and 3 outright. That's exactly
-- the kind of thing that would make the async flow feel broken/dominated
-- by the live path: choosing to keep doing rounds visibly ended them
-- instead.
--
-- Fix: actually check whether the sequence is really finished (current
-- round is the last one AND it's marked completed) before deciding which
-- status to fall back to, instead of assuming.

CREATE OR REPLACE FUNCTION respond_live_request(p_connection_id UUID, p_action TEXT) RETURNS VOID AS $$
DECLARE
  v_fallback_status TEXT;
  v_round_count INT;
  v_current_round INT;
  v_current_round_completed BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM connection_participants WHERE connection_id = p_connection_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not a participant in this connection';
  END IF;

  IF p_action = 'decline' OR p_action = 'continue_async' THEN
    SELECT c.current_round_number, s.round_count
    INTO v_current_round, v_round_count
    FROM connections c
    JOIN connection_prompt_sequences s ON s.id = c.prompt_sequence_id
    WHERE c.id = p_connection_id;

    SELECT EXISTS (
      SELECT 1 FROM connection_rounds
      WHERE connection_id = p_connection_id AND round_number = v_current_round AND status = 'completed'
    ) INTO v_current_round_completed;

    IF v_current_round_completed AND v_current_round >= v_round_count THEN
      v_fallback_status := 'exchange_complete';
    ELSE
      v_fallback_status := 'active';
    END IF;

    UPDATE connections SET status = v_fallback_status WHERE id = p_connection_id;
    UPDATE connection_live_sessions SET status = 'cancelled' WHERE connection_id = p_connection_id AND status = 'requested';
  ELSIF p_action = 'accept' THEN
    -- Stays in 'live_requested' while both sides submit availability; the
    -- scheduling RPCs move it to 'live_scheduled' once a slot is confirmed.
    NULL;
  ELSE
    RAISE EXCEPTION 'Unknown action %', p_action;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================================
-- ROLLBACK NOTES
--
-- This only redefines the function body (CREATE OR REPLACE), no schema
-- changes. Reverting to the migration 078 version restores the bug this
-- migration fixes.
-- =====================================================================
