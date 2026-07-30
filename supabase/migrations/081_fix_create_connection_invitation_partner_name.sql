-- 081: Fix create_connection_invitation() -- `connections.partner_name` is
-- a legacy column from migration 010 (`TEXT NOT NULL`, no default), used
-- by the old live-chat flow's createConfirmedConnection() to denormalize
-- the invite sender's display name onto the row. Migration 078's
-- create_connection_invitation() never populated it at all, so every
-- single async invitation has been failing with:
--   null value in column "partner_name" of relation "connections"
--   violates not-null constraint
-- Confirmed live via a real invitation attempt in the app.
--
-- Fix: look up the invitee's real display_name (and photo, while at it --
-- also nullable but the same denormalization mapAsyncConnectionRow()
-- already reads for the inviter's own dashboard view, see
-- lib/data/connectionAsync.ts) at invitation-creation time, same as the
-- legacy flow already does for its own equivalent columns.

CREATE OR REPLACE FUNCTION create_connection_invitation(
  p_to_user_id UUID,
  p_connection_type TEXT DEFAULT 'async',
  p_prompt_sequence_id UUID DEFAULT '00000000-0000-4000-8000-000000000001',
  p_shared_prompt TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_from_user_id UUID := auth.uid();
  v_connection_id UUID;
  v_expiry_hours INT := get_connection_setting_hours('connection_invitation_expiry_hours', 72);
  v_partner_name TEXT;
  v_partner_photo TEXT;
BEGIN
  IF v_from_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_from_user_id = p_to_user_id THEN
    RAISE EXCEPTION 'Cannot invite yourself';
  END IF;

  IF EXISTS (
    SELECT 1 FROM connection_blocks
    WHERE (blocker_id = v_from_user_id AND blocked_id = p_to_user_id)
       OR (blocker_id = p_to_user_id AND blocked_id = v_from_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot connect with this member';
  END IF;

  IF EXISTS (
    SELECT 1 FROM connections c
    JOIN connection_participants a ON a.connection_id = c.id AND a.user_id = v_from_user_id
    JOIN connection_participants b ON b.connection_id = c.id AND b.user_id = p_to_user_id
    WHERE c.status NOT IN ('declined', 'expired', 'ended', 'cancelled', 'completed')
  ) THEN
    RAISE EXCEPTION 'An open connection already exists between these members';
  END IF;

  SELECT display_name, COALESCE(profile_photo_path, profile_photo)
  INTO v_partner_name, v_partner_photo
  FROM profiles
  WHERE user_id = p_to_user_id;

  IF v_partner_name IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  INSERT INTO connections (
    user_id, partner_id, partner_name, partner_photo, status, connection_type, prompt_sequence_id,
    shared_prompt, invitation_expires_at, current_round_number
  ) VALUES (
    v_from_user_id, p_to_user_id, v_partner_name, v_partner_photo, 'awaiting_acceptance', p_connection_type, p_prompt_sequence_id,
    p_shared_prompt, NOW() + (v_expiry_hours || ' hours')::interval, 0
  ) RETURNING id INTO v_connection_id;

  INSERT INTO connection_participants (connection_id, user_id, invitation_status, accepted_at)
  VALUES (v_connection_id, v_from_user_id, 'accepted', NOW());

  INSERT INTO connection_participants (connection_id, user_id, invitation_status)
  VALUES (v_connection_id, p_to_user_id, 'invited');

  RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================================
-- ROLLBACK NOTES
--
-- This only redefines the function body (CREATE OR REPLACE), no schema
-- changes. To revert to the broken (migration 078) version, re-run that
-- migration's CREATE OR REPLACE FUNCTION create_connection_invitation
-- block -- not recommended, it will restore the not-null-constraint bug.
-- =====================================================================
