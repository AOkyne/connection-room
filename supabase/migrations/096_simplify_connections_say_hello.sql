-- 096: Simplify Connections, phase 1 -- "say hello" as the primary way
-- two members start talking, replacing the multi-step Guided Exchange
-- invitation flow as the default path. See docs/ASYNC_CONNECTIONS.md for
-- the flow this supersedes for NEW connections (existing in-flight
-- guided-exchange connections are untouched and keep working exactly as
-- before -- this migration adds a third `connection_type`, it does not
-- remove or alter the other two).
--
-- DESIGN:
--
-- 1. `connection_type = 'direct'` is the new lightweight type. A direct
--    connection either goes straight to `status = 'active'` (recipient's
--    messaging_privacy = 'any_member', the default) with the first message
--    inserted immediately, or sits at `status = 'awaiting_acceptance'`
--    with the opening text held in the new `pending_first_message` column
--    until the recipient accepts (messaging_privacy = 'connect_first').
--    This reuses `connections`/`connection_participants`/
--    `connection_messages` and their existing RLS untouched -- those
--    policies are already participant-scoped, not type-scoped.
--
-- 2. `say_hello()` mirrors `create_connection_invitation()`'s guard
--    clauses (not self, not blocked either direction) and its
--    denormalization pattern (migration 081's partner_name/partner_photo
--    lookup), but additionally reuses an already-open connection between
--    the two members instead of creating a second parallel thread.
--
-- 3. `accept_connection_invitation()` (migration 078) is extended,
--    CREATE OR REPLACE only, to branch on connection_type: a 'direct'
--    connection skips `open_connection_round()` entirely (there is no
--    prompt_sequence_id on a direct connection -- calling it would raise
--    "No prompt configured for round 1") and instead flushes
--    pending_first_message into connection_messages once both sides have
--    accepted.
--
-- 4. `notify_new_connection_invitation()` (migration 082) is widened to
--    also fire for connection_type = 'direct' connect-first requests, so
--    the recipient of a "connect first" request actually gets emailed
--    about it (previously only 'async' invitations notified). The
--    existing connection_messages-insert trigger (migration 077) already
--    fires generically on ANY first message regardless of connection_type
--    -- so the "any_member" immediate-hello path already gets a working
--    "someone messaged you" email for free, no changes needed there.
--
-- ROLLBACK NOTES are at the bottom of the file.

-- =====================================================================
-- 1. Messaging privacy preference. Reuses connection_preferences
--    (migration 010, actually wired to real writes since 078) rather than
--    a new table -- this is a per-user contact preference, exactly what
--    that table already models.
-- =====================================================================

ALTER TABLE connection_preferences
  ADD COLUMN IF NOT EXISTS messaging_privacy TEXT NOT NULL DEFAULT 'any_member'
    CHECK (messaging_privacy IN ('any_member', 'connect_first'));

-- =====================================================================
-- 2. Widen connections for the new lightweight type.
-- =====================================================================

ALTER TABLE connections DROP CONSTRAINT IF EXISTS connections_connection_type_check;
ALTER TABLE connections ADD CONSTRAINT connections_connection_type_check
  CHECK (connection_type IN ('async', 'live', 'direct'));

ALTER TABLE connections
  ADD COLUMN IF NOT EXISTS pending_first_message TEXT;

-- =====================================================================
-- 3. say_hello() -- the new primary entry point. SECURITY DEFINER, revoked
--    from PUBLIC and granted only to authenticated, same as every other
--    connections RPC in migration 078.
-- =====================================================================

CREATE OR REPLACE FUNCTION say_hello(p_to_user_id UUID, p_message_text TEXT) RETURNS UUID AS $$
DECLARE
  v_from_user_id UUID := auth.uid();
  v_connection_id UUID;
  v_existing_id UUID;
  v_from_name TEXT;
  v_partner_name TEXT;
  v_partner_photo TEXT;
  v_recipient_privacy TEXT;
BEGIN
  IF v_from_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_from_user_id = p_to_user_id THEN
    RAISE EXCEPTION 'Cannot say hello to yourself';
  END IF;

  IF p_message_text IS NULL OR length(trim(p_message_text)) = 0 THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;

  IF EXISTS (
    SELECT 1 FROM connection_blocks
    WHERE (blocker_id = v_from_user_id AND blocked_id = p_to_user_id)
       OR (blocker_id = p_to_user_id AND blocked_id = v_from_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot connect with this member';
  END IF;

  SELECT display_name INTO v_from_name FROM profiles WHERE user_id = v_from_user_id;

  SELECT display_name, COALESCE(profile_photo_path, profile_photo)
  INTO v_partner_name, v_partner_photo
  FROM profiles WHERE user_id = p_to_user_id;

  IF v_partner_name IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Reuse an already-open connection between these two members (of ANY
  -- type -- an existing guided-exchange or live connection counts too)
  -- rather than creating a second parallel thread.
  SELECT c.id INTO v_existing_id
  FROM connections c
  JOIN connection_participants a ON a.connection_id = c.id AND a.user_id = v_from_user_id
  JOIN connection_participants b ON b.connection_id = c.id AND b.user_id = p_to_user_id
  WHERE c.status NOT IN ('declined', 'expired', 'ended', 'cancelled', 'completed')
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    INSERT INTO connection_messages (connection_id, from_user_id, from_user_name, text)
    VALUES (v_existing_id, v_from_user_id, COALESCE(v_from_name, 'A member'), p_message_text);
    RETURN v_existing_id;
  END IF;

  SELECT messaging_privacy INTO v_recipient_privacy
  FROM connection_preferences WHERE user_id = p_to_user_id;

  IF COALESCE(v_recipient_privacy, 'any_member') = 'connect_first' THEN
    -- Held back: the recipient must accept before the message is
    -- delivered. accept_connection_invitation() flushes it in below.
    INSERT INTO connections (
      user_id, partner_id, partner_name, partner_photo, status, connection_type, pending_first_message
    ) VALUES (
      v_from_user_id, p_to_user_id, v_partner_name, v_partner_photo, 'awaiting_acceptance', 'direct', p_message_text
    ) RETURNING id INTO v_connection_id;

    INSERT INTO connection_participants (connection_id, user_id, invitation_status, accepted_at)
    VALUES (v_connection_id, v_from_user_id, 'accepted', NOW());
    INSERT INTO connection_participants (connection_id, user_id, invitation_status)
    VALUES (v_connection_id, p_to_user_id, 'invited');
  ELSE
    -- Default, low-friction path: no acceptance gate at all.
    INSERT INTO connections (
      user_id, partner_id, partner_name, partner_photo, status, connection_type, activated_at
    ) VALUES (
      v_from_user_id, p_to_user_id, v_partner_name, v_partner_photo, 'active', 'direct', NOW()
    ) RETURNING id INTO v_connection_id;

    INSERT INTO connection_participants (connection_id, user_id, invitation_status, accepted_at)
    VALUES (v_connection_id, v_from_user_id, 'accepted', NOW());
    INSERT INTO connection_participants (connection_id, user_id, invitation_status, accepted_at)
    VALUES (v_connection_id, p_to_user_id, 'accepted', NOW());

    INSERT INTO connection_messages (connection_id, from_user_id, from_user_name, text)
    VALUES (v_connection_id, v_from_user_id, COALESCE(v_from_name, 'A member'), p_message_text);
  END IF;

  RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION say_hello FROM PUBLIC;
GRANT EXECUTE ON FUNCTION say_hello TO authenticated;

-- =====================================================================
-- 4. Extend accept_connection_invitation() to handle 'direct' connections
--    -- CREATE OR REPLACE only, no signature change, existing callers
--    (the guided-exchange accept flow) behave identically for
--    connection_type IN ('async', 'live').
-- =====================================================================

CREATE OR REPLACE FUNCTION accept_connection_invitation(p_connection_id UUID) RETURNS TEXT AS $$
DECLARE
  v_status TEXT;
  v_accepted_count INT;
  v_connection_type TEXT;
  v_pending_message TEXT;
  v_from_user_id UUID;
  v_from_name TEXT;
BEGIN
  PERFORM 1 FROM connections WHERE id = p_connection_id FOR UPDATE;

  UPDATE connection_participants
  SET invitation_status = 'accepted', accepted_at = NOW()
  WHERE connection_id = p_connection_id AND user_id = auth.uid() AND invitation_status = 'invited';

  SELECT COUNT(*) INTO v_accepted_count
  FROM connection_participants WHERE connection_id = p_connection_id AND invitation_status = 'accepted';

  SELECT status, connection_type, pending_first_message, user_id
  INTO v_status, v_connection_type, v_pending_message, v_from_user_id
  FROM connections WHERE id = p_connection_id;

  IF v_accepted_count = 2 AND v_status = 'awaiting_acceptance' THEN
    UPDATE connections SET status = 'active', activated_at = NOW() WHERE id = p_connection_id;
    v_status := 'active';

    IF v_connection_type = 'direct' THEN
      IF v_pending_message IS NOT NULL THEN
        SELECT display_name INTO v_from_name FROM profiles WHERE user_id = v_from_user_id;
        INSERT INTO connection_messages (connection_id, from_user_id, from_user_name, text)
        VALUES (p_connection_id, v_from_user_id, COALESCE(v_from_name, 'A member'), v_pending_message);
        UPDATE connections SET pending_first_message = NULL WHERE id = p_connection_id;
      END IF;
    ELSE
      PERFORM open_connection_round(p_connection_id, 1);
    END IF;
  END IF;

  RETURN v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================================
-- 5. Widen the invitation-notification trigger so a connect-first
--    request actually notifies its recipient (previously only fired for
--    connection_type = 'async').
-- =====================================================================

CREATE OR REPLACE FUNCTION notify_new_connection_invitation() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.connection_type IN ('async', 'direct') AND NEW.status = 'awaiting_acceptance' THEN
    PERFORM net.http_post(
      url := 'https://community.trevorjamesla.com/api/webhooks/new-connection-invitation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer 8e698d7d4a7802cc70d8a1b826a8c0a29abeb3c2d3fb6adca07ffd082088514e'
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

-- =====================================================================
-- MANUAL STEP REQUIRED BEFORE THIS TRIGGER CHANGE TAKES REAL EFFECT:
-- Same as migration 082 -- replace 'REPLACE_WITH_POST_NOTIFICATION_WEBHOOK_SECRET'
-- above with the real POST_NOTIFICATION_WEBHOOK_SECRET value before
-- relying on this in production. If migration 082's placeholder was
-- already replaced live in the database (not just in this file), this
-- CREATE OR REPLACE will silently reintroduce the placeholder unless the
-- real secret is substituted here too before running.
-- =====================================================================

-- =====================================================================
-- ROLLBACK NOTES
--
-- DROP FUNCTION IF EXISTS say_hello(UUID, TEXT);
-- -- Restore accept_connection_invitation() and notify_new_connection_invitation()
-- -- by re-running their CREATE OR REPLACE blocks from migrations 078/082.
-- ALTER TABLE connections DROP COLUMN IF EXISTS pending_first_message;
-- ALTER TABLE connections DROP CONSTRAINT IF EXISTS connections_connection_type_check;
-- ALTER TABLE connections ADD CONSTRAINT connections_connection_type_check
--   CHECK (connection_type IN ('async', 'live'));
-- ALTER TABLE connection_preferences DROP COLUMN IF EXISTS messaging_privacy;
--
-- No existing rows are rewritten by this migration; every new column is
-- nullable or has a safe default, and no prior migration's SQL is edited.
-- =====================================================================
