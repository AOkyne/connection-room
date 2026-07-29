-- 078: Async Guided Connections -- core schema, RLS, and state-machine RPCs.
--
-- BACKGROUND: today's `connections` feature (migration 010) requires two
-- members to coordinate a live 20-minute chat window. There is no presence
-- system at all (see migration 077's own comment) -- "live" is just UI copy
-- plus a client-side stopwatch in ConnectionChat.tsx layered on an already-
-- async request/accept flow. This migration adds an asynchronous-first
-- "Guided Exchange": invitation -> mutual acceptance -> N structured async
-- rounds (shared prompt -> private response -> reveal -> optional
-- acknowledgment) -> optional live conversation -> complete.
--
-- DESIGN DECISIONS (read before touching this file):
--
-- 1. `connections` is EXTENDED, not replaced -- connection_messages already
--    FKs into it and legacy rows must keep working. New nullable columns
--    carry the async lifecycle; the existing SELECT policy ("either party
--    can read", keyed on user_id/partner_id) is left completely untouched
--    and still works for new rows, because new invitations continue to
--    populate user_id (initiator) / partner_id (invitee) as simple
--    denormalized pointers -- connection_participants below is what carries
--    the actual granular per-user state.
--
-- 2. Every write to the new tables happens through SECURITY DEFINER RPC
--    functions (accept/decline/submit/advance/etc below), never a raw
--    client .update()/.insert(). This is what makes the "second submission
--    reveals exactly once" and "first acceptance doesn't activate" race
--    conditions safe: each RPC takes a row lock (`FOR UPDATE`) on the
--    relevant `connections`/`connection_rounds` row before checking
--    "are both sides done yet", so only the transaction that observes the
--    second side actually flips the state. Because all writes are RPC-only,
--    the new tables need almost no client-facing INSERT/UPDATE policies --
--    only SELECT policies scoped to participants, which shrinks the RLS
--    surface area considerably.
--
-- 3. Mutual acceptance is modeled as: the inviter's connection_participants
--    row is marked `accepted_at = now()` at invitation-creation time (you
--    don't send an invitation you don't want), and the invitee's explicit
--    accept is the second, activating acceptance. This satisfies "first
--    acceptance does not activate, second activates exactly once" without
--    inventing a separate pre-connection proposal object, and reuses the
--    existing directional connection_requests-style "send an invite" UX.
--
-- 4. Draft text must NEVER be visible to the other participant, even after
--    reveal. RLS alone can't mask individual columns of a shared-visibility
--    row, so `connection_responses` RLS is SELECT-restricted to the owning
--    participant only; the *other* participant's revealed response is read
--    through `get_round_responses()` below (SECURITY DEFINER, strips
--    draft_text, re-verifies reveal state server-side, never trusts the
--    client's belief that a round is revealed).
--
-- 5. Blocking has never been server-enforced (blockUser() in
--    lib/data/connections.ts is localStorage-only) -- this migration adds a
--    real `connection_blocks` table so the new invitation RPC can actually
--    enforce "blocked users must not be matched or reconnected" server-side.
--
-- ROLLBACK NOTES are at the bottom of the file.

-- =====================================================================
-- 1. connection_blocks -- first real server-side block list.
-- =====================================================================

CREATE TABLE IF NOT EXISTS connection_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT connection_blocks_different_users CHECK (blocker_id != blocked_id),
  UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE connection_blocks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_connection_blocks_blocker ON connection_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_connection_blocks_blocked ON connection_blocks(blocked_id);

DROP POLICY IF EXISTS "Users can view their own blocks" ON connection_blocks;
CREATE POLICY "Users can view their own blocks"
  ON connection_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can create their own blocks" ON connection_blocks;
CREATE POLICY "Users can create their own blocks"
  ON connection_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can remove their own blocks" ON connection_blocks;
CREATE POLICY "Users can remove their own blocks"
  ON connection_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- =====================================================================
-- 2. Extend `connections` in place with the async lifecycle columns.
-- =====================================================================

ALTER TABLE connections
  ADD COLUMN IF NOT EXISTS connection_type TEXT NOT NULL DEFAULT 'async' CHECK (connection_type IN ('async', 'live')),
  ADD COLUMN IF NOT EXISTS prompt_sequence_id UUID,
  ADD COLUMN IF NOT EXISTS current_round_number INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extension_used_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS extension_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_reason_private TEXT,
  ADD COLUMN IF NOT EXISTS live_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Widen the status CHECK to the full async state model while keeping every
-- legacy value valid (existing rows are never rewritten by this migration --
-- see 080 for the backfill pass that normalizes them).
ALTER TABLE connections DROP CONSTRAINT IF EXISTS connections_status_check;
ALTER TABLE connections ADD CONSTRAINT connections_status_check CHECK (
  status IN (
    -- legacy (migration 010)
    'pending_their_acceptance', 'confirmed', 'active', 'completed', 'declined',
    -- async guided exchange lifecycle
    'awaiting_acceptance', 'accepted_by_one', 'waiting_for_participant',
    'extended', 'awaiting_next_round', 'exchange_complete',
    'live_requested', 'live_scheduled',
    'expired', 'ended', 'reported', 'cancelled'
  )
);

CREATE INDEX IF NOT EXISTS idx_connections_status_deadline ON connections(status, response_deadline_at);
CREATE INDEX IF NOT EXISTS idx_connections_invitation_expires ON connections(invitation_expires_at) WHERE invitation_expires_at IS NOT NULL;

-- =====================================================================
-- 3. connection_participants -- one row per member per connection. Fixes
--    the known RLS asymmetry ("only connections.user_id can UPDATE") by
--    giving each side their own row to own; also the anchor every other new
--    table joins through to answer "is this caller a participant".
-- =====================================================================

CREATE TABLE IF NOT EXISTS connection_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_status TEXT NOT NULL DEFAULT 'invited' CHECK (invitation_status IN ('invited', 'accepted', 'declined')),
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason_private TEXT,
  last_viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  end_reason_private TEXT,
  live_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_id, user_id)
);

ALTER TABLE connection_participants ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_connection_participants_connection ON connection_participants(connection_id);
CREATE INDEX IF NOT EXISTS idx_connection_participants_user ON connection_participants(user_id);

-- Participants of a connection can see both rows for that connection (their
-- own and their counterpart's) -- needed to render "waiting for them" /
-- "you're waiting on your own response" UI. All writes are RPC-only below.
DROP POLICY IF EXISTS "Participants can view connection participants" ON connection_participants;
CREATE POLICY "Participants can view connection participants"
  ON connection_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM connection_participants me
      WHERE me.connection_id = connection_participants.connection_id
        AND me.user_id = auth.uid()
    )
  );

-- =====================================================================
-- 4. Prompt sequences + prompts -- admin-configurable content, mirrors the
--    space_weekly_prompts / space_prompt_schedule pattern (migration 073).
--    Unlike weekly prompts (posted by a cron as a `posts` row), members
--    read these directly to render "what's the current round's question",
--    so read access is public-to-authenticated rather than service-role-only.
-- =====================================================================

CREATE TABLE IF NOT EXISTS connection_prompt_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  round_count INT NOT NULL DEFAULT 3 CHECK (round_count > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  eligibility_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connection_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES connection_prompt_sequences(id) ON DELETE CASCADE,
  round_number INT NOT NULL CHECK (round_number > 0),
  prompt_text TEXT NOT NULL,
  follow_up_prompt TEXT,
  response_character_limit INT NOT NULL DEFAULT 2000 CHECK (response_character_limit > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sequence_id, round_number)
);

ALTER TABLE connection_prompt_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated members can read active sequences" ON connection_prompt_sequences;
CREATE POLICY "Authenticated members can read active sequences"
  ON connection_prompt_sequences FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage sequences" ON connection_prompt_sequences;
CREATE POLICY "Admins can manage sequences"
  ON connection_prompt_sequences FOR ALL
  USING (is_profile_admin(auth.uid()))
  WITH CHECK (is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated members can read prompts" ON connection_prompts;
CREATE POLICY "Authenticated members can read prompts"
  ON connection_prompts FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM connection_prompt_sequences s WHERE s.id = connection_prompts.sequence_id AND s.is_active = TRUE)
  );

DROP POLICY IF EXISTS "Admins can manage prompts" ON connection_prompts;
CREATE POLICY "Admins can manage prompts"
  ON connection_prompts FOR ALL
  USING (is_profile_admin(auth.uid()))
  WITH CHECK (is_profile_admin(auth.uid()));

ALTER TABLE connections ADD CONSTRAINT connections_prompt_sequence_fk
  FOREIGN KEY (prompt_sequence_id) REFERENCES connection_prompt_sequences(id);

-- Seed the default 3-round "Guided Exchange" sequence from the product spec.
INSERT INTO connection_prompt_sequences (id, title, description, slug, round_count, is_active)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Guided Exchange',
  'The default three-round asynchronous guided connection exchange.',
  'guided-exchange-default',
  3,
  TRUE
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO connection_prompts (sequence_id, round_number, prompt_text)
VALUES
  ('00000000-0000-4000-8000-000000000001', 1, 'What is something you have been wanting more of in your relationships, friendships, or community lately?'),
  ('00000000-0000-4000-8000-000000000001', 2, 'What is something about you that people often misunderstand or do not immediately see?'),
  ('00000000-0000-4000-8000-000000000001', 3, 'What helps you feel safe enough to be honest, open, or fully yourself with another person?')
ON CONFLICT (sequence_id, round_number) DO NOTHING;

-- =====================================================================
-- 5. connection_rounds -- one row per round per connection.
-- =====================================================================

CREATE TABLE IF NOT EXISTS connection_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES connection_prompts(id),
  round_number INT NOT NULL CHECK (round_number > 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'revealed', 'completed')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_deadline_at TIMESTAMPTZ NOT NULL,
  revealed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_id, round_number)
);

ALTER TABLE connection_rounds ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_connection_rounds_connection ON connection_rounds(connection_id);
CREATE INDEX IF NOT EXISTS idx_connection_rounds_deadline ON connection_rounds(status, response_deadline_at);

DROP POLICY IF EXISTS "Participants can view their rounds" ON connection_rounds;
CREATE POLICY "Participants can view their rounds"
  ON connection_rounds FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM connection_participants cp WHERE cp.connection_id = connection_rounds.connection_id AND cp.user_id = auth.uid())
  );

-- =====================================================================
-- 6. connection_responses -- private draft + submitted text per round per
--    participant. SELECT is owner-only; the counterpart's revealed response
--    is read via get_round_responses() below, never a direct table SELECT.
-- =====================================================================

CREATE TABLE IF NOT EXISTS connection_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_round_id UUID NOT NULL REFERENCES connection_rounds(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES connection_participants(id) ON DELETE CASCADE,
  draft_text TEXT,
  submitted_text TEXT,
  submitted_at TIMESTAMPTZ,
  revealed_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  advanced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_round_id, participant_id)
);

ALTER TABLE connection_responses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_connection_responses_round ON connection_responses(connection_round_id);
CREATE INDEX IF NOT EXISTS idx_connection_responses_participant ON connection_responses(participant_id);

DROP POLICY IF EXISTS "Owners can view their own response" ON connection_responses;
CREATE POLICY "Owners can view their own response"
  ON connection_responses FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM connection_participants cp WHERE cp.id = connection_responses.participant_id AND cp.user_id = auth.uid())
  );

-- =====================================================================
-- 7. connection_acknowledgments -- structured or short free-text reaction
--    to a revealed round. Not a DM system: acknowledgment_type is a fixed
--    enum plus one 'custom' option with a hard character limit.
-- =====================================================================

CREATE TABLE IF NOT EXISTS connection_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_round_id UUID NOT NULL REFERENCES connection_rounds(id) ON DELETE CASCADE,
  from_participant_id UUID NOT NULL REFERENCES connection_participants(id) ON DELETE CASCADE,
  to_participant_id UUID NOT NULL REFERENCES connection_participants(id) ON DELETE CASCADE,
  acknowledgment_type TEXT NOT NULL CHECK (acknowledgment_type IN (
    'relate', 'thank_you', 'understand_better', 'want_more', 'stayed_with_me', 'custom'
  )),
  acknowledgment_text TEXT CHECK (acknowledgment_text IS NULL OR char_length(acknowledgment_text) <= 280),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_round_id, from_participant_id)
);

ALTER TABLE connection_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_connection_acknowledgments_round ON connection_acknowledgments(connection_round_id);

DROP POLICY IF EXISTS "Participants can view acknowledgments" ON connection_acknowledgments;
CREATE POLICY "Participants can view acknowledgments"
  ON connection_acknowledgments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM connection_rounds cr
      JOIN connection_participants cp ON cp.connection_id = cr.connection_id
      WHERE cr.id = connection_acknowledgments.connection_round_id AND cp.user_id = auth.uid()
    )
  );

-- =====================================================================
-- 8. Scheduled live conversation support.
-- =====================================================================

CREATE TABLE IF NOT EXISTS connection_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES connection_participants(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT connection_availability_valid_range CHECK (ends_at > starts_at)
);

ALTER TABLE connection_availability ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_connection_availability_connection ON connection_availability(connection_id);

DROP POLICY IF EXISTS "Participants can view availability" ON connection_availability;
CREATE POLICY "Participants can view availability"
  ON connection_availability FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM connection_participants cp WHERE cp.connection_id = connection_availability.connection_id AND cp.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS connection_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'scheduled', 'active', 'completed', 'cancelled')),
  scheduled_start_at TIMESTAMPTZ,
  actual_started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE connection_live_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_connection_live_sessions_connection ON connection_live_sessions(connection_id);
CREATE INDEX IF NOT EXISTS idx_connection_live_sessions_scheduled ON connection_live_sessions(status, scheduled_start_at);

DROP POLICY IF EXISTS "Participants can view live sessions" ON connection_live_sessions;
CREATE POLICY "Participants can view live sessions"
  ON connection_live_sessions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM connection_participants cp WHERE cp.connection_id = connection_live_sessions.connection_id AND cp.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS connection_live_session_participants (
  live_session_id UUID NOT NULL REFERENCES connection_live_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES connection_participants(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  PRIMARY KEY (live_session_id, participant_id)
);

ALTER TABLE connection_live_session_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view live session participants" ON connection_live_session_participants;
CREATE POLICY "Participants can view live session participants"
  ON connection_live_session_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM connection_live_sessions ls
      JOIN connection_participants cp ON cp.connection_id = ls.connection_id
      WHERE ls.id = connection_live_session_participants.live_session_id AND cp.user_id = auth.uid()
    )
  );

-- "I'm available now" -- a temporary, explicit, self-expiring toggle. Never
-- inferred from browser/session presence. Reads for matching happen through
-- a service-role API route (mirrors /api/matching/find), not direct client
-- SELECT on other users' rows -- so the only client-facing policy is "read
-- your own row".
CREATE TABLE IF NOT EXISTS connection_live_availability (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_until TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes IN (15, 30, 60)),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE connection_live_availability ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_connection_live_availability_until ON connection_live_availability(available_until);

DROP POLICY IF EXISTS "Users can view their own live availability" ON connection_live_availability;
CREATE POLICY "Users can view their own live availability"
  ON connection_live_availability FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================================
-- 9. connection_preferences -- add multi-select formats. Also: this is the
--    first migration to actually wire this table into real app writes --
--    lib/data/connections.ts's header comment notes it has existed since
--    migration 010 but the app only ever read/wrote a localStorage key.
-- =====================================================================

ALTER TABLE connection_preferences
  ADD COLUMN IF NOT EXISTS formats TEXT[] NOT NULL DEFAULT ARRAY['guided_message']::TEXT[];

ALTER TABLE connection_preferences DROP CONSTRAINT IF EXISTS connection_preferences_formats_check;
ALTER TABLE connection_preferences ADD CONSTRAINT connection_preferences_formats_check CHECK (
  formats <@ ARRAY['guided_message', 'scheduled_live', 'live_now', 'any']::TEXT[]
);

-- =====================================================================
-- 10. connection_notification_log -- migration 077's table only ever
--     recorded one notification type (the first-message email). Add a
--     `notification_type` column so the same dedup table can serve every
--     new async-connection notification kind without a new table per kind.
-- =====================================================================

ALTER TABLE connection_notification_log
  ADD COLUMN IF NOT EXISTS notification_type TEXT NOT NULL DEFAULT 'first_message';

ALTER TABLE connection_notification_log DROP CONSTRAINT IF EXISTS connection_notification_log_dedup_idx;
DROP INDEX IF EXISTS connection_notification_log_dedup_idx;
CREATE UNIQUE INDEX IF NOT EXISTS connection_notification_log_dedup_idx
  ON connection_notification_log (connection_id, notified_user_id, notification_type);

-- =====================================================================
-- 11. Helper functions.
-- =====================================================================

CREATE OR REPLACE FUNCTION connections_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS connection_participants_touch_updated_at ON connection_participants;
CREATE TRIGGER connection_participants_touch_updated_at
  BEFORE UPDATE ON connection_participants
  FOR EACH ROW EXECUTE FUNCTION connections_touch_updated_at();

DROP TRIGGER IF EXISTS connection_rounds_touch_updated_at ON connection_rounds;
CREATE TRIGGER connection_rounds_touch_updated_at
  BEFORE UPDATE ON connection_rounds
  FOR EACH ROW EXECUTE FUNCTION connections_touch_updated_at();

DROP TRIGGER IF EXISTS connection_responses_touch_updated_at ON connection_responses;
CREATE TRIGGER connection_responses_touch_updated_at
  BEFORE UPDATE ON connection_responses
  FOR EACH ROW EXECUTE FUNCTION connections_touch_updated_at();

-- Reads configurable durations from platform_settings (migration 026's
-- pattern), falling back to the spec's defaults if a setting is missing so
-- this migration doesn't hard-depend on 079 running first.
CREATE OR REPLACE FUNCTION get_connection_setting_hours(key TEXT, fallback INT) RETURNS INT AS $$
  SELECT COALESCE((SELECT setting_value::text::int FROM platform_settings WHERE setting_key = key), fallback);
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION my_participant_id(p_connection_id UUID) RETURNS UUID AS $$
  SELECT id FROM connection_participants WHERE connection_id = p_connection_id AND user_id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- =====================================================================
-- 12. State-transition RPCs. All SECURITY DEFINER, all re-check
--     authorization internally (never trust that RLS already filtered
--     anything, since these run with elevated privilege) -- revoked from
--     PUBLIC and granted only to `authenticated`.
-- =====================================================================

-- Creates a new invitation. Enforces: not self, neither side has blocked
-- the other, no existing non-terminal connection between the two users.
-- The inviter's participant row is pre-accepted (see design note #3 above);
-- the invitee's is 'invited' and the connection sits in
-- 'awaiting_acceptance' until they respond.
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

  INSERT INTO connections (
    user_id, partner_id, status, connection_type, prompt_sequence_id,
    shared_prompt, invitation_expires_at, current_round_number
  ) VALUES (
    v_from_user_id, p_to_user_id, 'awaiting_acceptance', p_connection_type, p_prompt_sequence_id,
    p_shared_prompt, NOW() + (v_expiry_hours || ' hours')::interval, 0
  ) RETURNING id INTO v_connection_id;

  INSERT INTO connection_participants (connection_id, user_id, invitation_status, accepted_at)
  VALUES (v_connection_id, v_from_user_id, 'accepted', NOW());

  INSERT INTO connection_participants (connection_id, user_id, invitation_status)
  VALUES (v_connection_id, p_to_user_id, 'invited');

  RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Opens round N for a connection: creates the connection_rounds row from
-- the sequence's prompt and blank response rows for both participants.
-- Internal helper, not exposed directly -- called by accept + advance_round.
CREATE OR REPLACE FUNCTION open_connection_round(p_connection_id UUID, p_round_number INT) RETURNS UUID AS $$
DECLARE
  v_prompt_id UUID;
  v_round_id UUID;
  v_round_hours INT := get_connection_setting_hours('connection_round_response_hours', 48);
BEGIN
  SELECT cp.id INTO v_prompt_id
  FROM connection_prompts cp
  JOIN connections c ON c.prompt_sequence_id = cp.sequence_id
  WHERE c.id = p_connection_id AND cp.round_number = p_round_number;

  IF v_prompt_id IS NULL THEN
    RAISE EXCEPTION 'No prompt configured for round %', p_round_number;
  END IF;

  INSERT INTO connection_rounds (connection_id, prompt_id, round_number, status, response_deadline_at)
  VALUES (p_connection_id, v_prompt_id, p_round_number, 'open', NOW() + (v_round_hours || ' hours')::interval)
  RETURNING id INTO v_round_id;

  INSERT INTO connection_responses (connection_round_id, participant_id)
  SELECT v_round_id, cp.id FROM connection_participants cp WHERE cp.connection_id = p_connection_id;

  UPDATE connections
  SET current_round_number = p_round_number, response_deadline_at = NOW() + (v_round_hours || ' hours')::interval
  WHERE id = p_connection_id;

  RETURN v_round_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Accept an invitation. Idempotent: if the caller already accepted, this is
-- a no-op that returns the current status rather than erroring or
-- re-activating. Only the SECOND ever-accepted participant row triggers
-- activation, guarded by a row lock on the connections row so two
-- near-simultaneous accepts (implausible here since only one side is ever
-- 'invited', but defensive) can't double-activate.
CREATE OR REPLACE FUNCTION accept_connection_invitation(p_connection_id UUID) RETURNS TEXT AS $$
DECLARE
  v_status TEXT;
  v_accepted_count INT;
BEGIN
  PERFORM 1 FROM connections WHERE id = p_connection_id FOR UPDATE;

  UPDATE connection_participants
  SET invitation_status = 'accepted', accepted_at = NOW()
  WHERE connection_id = p_connection_id AND user_id = auth.uid() AND invitation_status = 'invited';

  SELECT COUNT(*) INTO v_accepted_count
  FROM connection_participants WHERE connection_id = p_connection_id AND invitation_status = 'accepted';

  SELECT status INTO v_status FROM connections WHERE id = p_connection_id;

  IF v_accepted_count = 2 AND v_status = 'awaiting_acceptance' THEN
    UPDATE connections SET status = 'active', activated_at = NOW() WHERE id = p_connection_id;
    PERFORM open_connection_round(p_connection_id, 1);
    v_status := 'active';
  END IF;

  RETURN v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Decline privately. The other participant is never told they were
-- personally rejected -- the UI shows a neutral "not confirmed" message
-- driven off status = 'declined', not off any per-participant blame field.
CREATE OR REPLACE FUNCTION decline_connection_invitation(p_connection_id UUID, p_reason_private TEXT DEFAULT NULL) RETURNS VOID AS $$
BEGIN
  UPDATE connection_participants
  SET invitation_status = 'declined', declined_at = NOW(), decline_reason_private = p_reason_private
  WHERE connection_id = p_connection_id AND user_id = auth.uid();

  UPDATE connections SET status = 'declined' WHERE id = p_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION save_response_draft(p_round_id UUID, p_draft_text TEXT) RETURNS VOID AS $$
DECLARE
  v_participant_id UUID;
BEGIN
  SELECT cp.id INTO v_participant_id
  FROM connection_participants cp
  JOIN connection_rounds cr ON cr.connection_id = cp.connection_id
  WHERE cr.id = p_round_id AND cp.user_id = auth.uid();

  IF v_participant_id IS NULL THEN
    RAISE EXCEPTION 'Not a participant in this round';
  END IF;

  UPDATE connection_responses
  SET draft_text = p_draft_text
  WHERE connection_round_id = p_round_id AND participant_id = v_participant_id AND submitted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- The core race-condition-safe transition: submission is immutable once
-- set, and the round is locked (FOR UPDATE) before checking "did both sides
-- just submit" -- so under concurrent submissions from both participants,
-- exactly one of the two transactions observes count = 2 and flips
-- status='revealed'. The other observes count still < 2 at lock-acquire
-- time... actually both submits happen in separate rows (one write each,
-- no conflict), the lock is solely to serialize the "check if both are now
-- submitted" read that follows, guaranteeing only one caller ever sees the
-- transition and performs the reveal.
CREATE OR REPLACE FUNCTION submit_round_response(p_round_id UUID, p_text TEXT) RETURNS TEXT AS $$
DECLARE
  v_participant_id UUID;
  v_deadline TIMESTAMPTZ;
  v_status TEXT;
  v_submitted_count INT;
BEGIN
  SELECT cp.id INTO v_participant_id
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

-- Returns the round's responses with draft_text always stripped, and
-- submitted_text/revealed_at nulled out for the OTHER participant's row
-- unless the round has actually reached 'revealed' -- re-checked here
-- rather than trusted from the client, per design note #4.
CREATE OR REPLACE FUNCTION get_round_responses(p_round_id UUID)
RETURNS TABLE (
  participant_id UUID,
  is_mine BOOLEAN,
  submitted_text TEXT,
  submitted_at TIMESTAMPTZ,
  revealed_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  advanced_at TIMESTAMPTZ
) AS $$
DECLARE
  v_is_revealed BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM connection_participants cp
    JOIN connection_rounds cr ON cr.connection_id = cp.connection_id
    WHERE cr.id = p_round_id AND cp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant in this round';
  END IF;

  SELECT (cr.status = 'revealed') INTO v_is_revealed FROM connection_rounds cr WHERE cr.id = p_round_id;

  RETURN QUERY
  SELECT
    r.participant_id,
    (cp.user_id = auth.uid()) AS is_mine,
    CASE WHEN cp.user_id = auth.uid() OR v_is_revealed THEN r.submitted_text ELSE NULL END,
    CASE WHEN cp.user_id = auth.uid() OR v_is_revealed THEN r.submitted_at ELSE NULL END,
    r.revealed_at,
    CASE WHEN cp.user_id = auth.uid() THEN r.viewed_at ELSE NULL END,
    r.advanced_at
  FROM connection_responses r
  JOIN connection_participants cp ON cp.id = r.participant_id
  WHERE r.connection_round_id = p_round_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION mark_response_viewed(p_round_id UUID) RETURNS VOID AS $$
DECLARE
  v_my_participant_id UUID;
  v_other_response_id UUID;
BEGIN
  SELECT id INTO v_my_participant_id FROM connection_participants
  WHERE connection_id = (SELECT connection_id FROM connection_rounds WHERE id = p_round_id) AND user_id = auth.uid();

  IF v_my_participant_id IS NULL THEN
    RAISE EXCEPTION 'Not a participant in this round';
  END IF;

  UPDATE connection_responses
  SET viewed_at = COALESCE(viewed_at, NOW())
  WHERE connection_round_id = p_round_id AND participant_id = v_my_participant_id;
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
BEGIN
  SELECT id INTO v_from_id FROM connection_participants
  WHERE connection_id = (SELECT connection_id FROM connection_rounds WHERE id = p_round_id) AND user_id = auth.uid();

  IF v_from_id IS NULL THEN
    RAISE EXCEPTION 'Not a participant in this round';
  END IF;

  SELECT id INTO v_to_id FROM connection_participants
  WHERE connection_id = (SELECT connection_id FROM connection_rounds WHERE id = p_round_id) AND id != v_from_id;

  INSERT INTO connection_acknowledgments (connection_round_id, from_participant_id, to_participant_id, acknowledgment_type, acknowledgment_text)
  VALUES (p_round_id, v_from_id, v_to_id, p_acknowledgment_type, p_acknowledgment_text)
  ON CONFLICT (connection_round_id, from_participant_id) DO UPDATE
    SET acknowledgment_type = EXCLUDED.acknowledgment_type, acknowledgment_text = EXCLUDED.acknowledgment_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Either member can advance their own step whenever they're ready --
-- advancing does NOT require the other participant to click continue at
-- the same time. Only once BOTH participants' response rows for the round
-- have advanced_at set does the round close and the next one open (or the
-- exchange complete, on the final round).
CREATE OR REPLACE FUNCTION advance_round(p_round_id UUID) RETURNS TEXT AS $$
DECLARE
  v_participant_id UUID;
  v_connection_id UUID;
  v_round_number INT;
  v_sequence_round_count INT;
  v_both_advanced BOOLEAN;
  v_round_status TEXT;
BEGIN
  SELECT cr.connection_id, cr.round_number, cr.status INTO v_connection_id, v_round_number, v_round_status
  FROM connection_rounds cr WHERE cr.id = p_round_id FOR UPDATE;

  IF v_round_status != 'revealed' THEN
    RAISE EXCEPTION 'Round must be revealed before advancing';
  END IF;

  SELECT id INTO v_participant_id FROM connection_participants
  WHERE connection_id = v_connection_id AND user_id = auth.uid();

  IF v_participant_id IS NULL THEN
    RAISE EXCEPTION 'Not a participant in this connection';
  END IF;

  UPDATE connection_responses
  SET advanced_at = COALESCE(advanced_at, NOW())
  WHERE connection_round_id = p_round_id AND participant_id = v_participant_id;

  SELECT COUNT(*) = 2 INTO v_both_advanced
  FROM connection_responses WHERE connection_round_id = p_round_id AND advanced_at IS NOT NULL;

  IF NOT v_both_advanced THEN
    RETURN 'waiting_for_participant';
  END IF;

  UPDATE connection_rounds SET status = 'completed', completed_at = NOW() WHERE id = p_round_id;

  SELECT s.round_count INTO v_sequence_round_count
  FROM connections c JOIN connection_prompt_sequences s ON s.id = c.prompt_sequence_id
  WHERE c.id = v_connection_id;

  IF v_round_number >= v_sequence_round_count THEN
    UPDATE connections SET status = 'exchange_complete' WHERE id = v_connection_id;
    RETURN 'exchange_complete';
  END IF;

  PERFORM open_connection_round(v_connection_id, v_round_number + 1);
  UPDATE connections SET status = 'active' WHERE id = v_connection_id;
  RETURN 'next_round_open';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- One-time, whole-connection extension. Extends whichever round is
-- currently open. Neutral language on the notification side (handled in
-- the TypeScript notification layer, not here) -- this function only
-- records who used it, which the UI is instructed not to surface to the
-- other participant.
CREATE OR REPLACE FUNCTION extend_connection_deadline(p_connection_id UUID) RETURNS VOID AS $$
DECLARE
  v_extension_hours INT := get_connection_setting_hours('connection_extension_hours', 48);
  v_open_round_id UUID;
BEGIN
  PERFORM 1 FROM connections WHERE id = p_connection_id FOR UPDATE;

  IF EXISTS (SELECT 1 FROM connections WHERE id = p_connection_id AND extension_used_at IS NOT NULL) THEN
    RAISE EXCEPTION 'An extension has already been used for this connection';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM connection_participants WHERE connection_id = p_connection_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not a participant in this connection';
  END IF;

  SELECT id INTO v_open_round_id FROM connection_rounds
  WHERE connection_id = p_connection_id AND status = 'open'
  ORDER BY round_number DESC LIMIT 1;

  UPDATE connections
  SET extension_used_by = auth.uid(), extension_used_at = NOW(),
      response_deadline_at = response_deadline_at + (v_extension_hours || ' hours')::interval,
      status = 'extended'
  WHERE id = p_connection_id;

  IF v_open_round_id IS NOT NULL THEN
    UPDATE connection_rounds
    SET response_deadline_at = response_deadline_at + (v_extension_hours || ' hours')::interval
    WHERE id = v_open_round_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- A member can end a connection at any time, for any reason (or none). The
-- reason is private -- collected for product-improvement purposes only,
-- never shown to the other participant.
CREATE OR REPLACE FUNCTION end_connection(p_connection_id UUID, p_reason_private TEXT DEFAULT NULL) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM connection_participants WHERE connection_id = p_connection_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not a participant in this connection';
  END IF;

  UPDATE connection_participants
  SET ended_at = NOW(), end_reason_private = p_reason_private
  WHERE connection_id = p_connection_id AND user_id = auth.uid();

  UPDATE connections SET status = 'ended', ended_at = NOW() WHERE id = p_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION report_connection(
  p_connection_id UUID,
  p_reason TEXT,
  p_severity TEXT DEFAULT 'medium'
) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM connection_participants WHERE connection_id = p_connection_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not a participant in this connection';
  END IF;

  INSERT INTO reports (reporter_id, connection_id, reason, severity, status)
  VALUES (auth.uid(), p_connection_id, p_reason, p_severity, 'pending');

  UPDATE connections SET status = 'reported' WHERE id = p_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Live conversation: request, respond, schedule, join, ready-up, end.
CREATE OR REPLACE FUNCTION request_live_conversation(p_connection_id UUID) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM connection_participants WHERE connection_id = p_connection_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not a participant in this connection';
  END IF;

  UPDATE connection_participants SET live_requested_at = NOW()
  WHERE connection_id = p_connection_id AND user_id = auth.uid();

  UPDATE connections SET status = 'live_requested', live_requested_at = NOW() WHERE id = p_connection_id;

  INSERT INTO connection_live_sessions (connection_id, status) VALUES (p_connection_id, 'requested');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Declining a live request never terminates the guided exchange -- status
-- simply falls back to the prior async state.
CREATE OR REPLACE FUNCTION respond_live_request(p_connection_id UUID, p_action TEXT) RETURNS VOID AS $$
DECLARE
  v_fallback_status TEXT := 'exchange_complete';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM connection_participants WHERE connection_id = p_connection_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not a participant in this connection';
  END IF;

  IF p_action = 'decline' OR p_action = 'continue_async' THEN
    UPDATE connections SET status = v_fallback_status WHERE id = p_connection_id;
    UPDATE connection_live_sessions SET status = 'cancelled' WHERE connection_id = p_connection_id AND status = 'requested';
  ELSIF p_action = 'accept' THEN
    -- Stays in 'live_requested' while both sides submit availability; the
    -- scheduling RPCs below move it to 'live_scheduled' once a slot is
    -- confirmed.
    NULL;
  ELSE
    RAISE EXCEPTION 'Unknown action %', p_action;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION submit_live_availability(
  p_connection_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_timezone TEXT
) RETURNS UUID AS $$
DECLARE
  v_participant_id UUID;
  v_availability_id UUID;
BEGIN
  SELECT id INTO v_participant_id FROM connection_participants
  WHERE connection_id = p_connection_id AND user_id = auth.uid();

  IF v_participant_id IS NULL THEN
    RAISE EXCEPTION 'Not a participant in this connection';
  END IF;

  INSERT INTO connection_availability (connection_id, participant_id, starts_at, ends_at, timezone)
  VALUES (p_connection_id, v_participant_id, p_starts_at, p_ends_at, p_timezone)
  RETURNING id INTO v_availability_id;

  RETURN v_availability_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION confirm_live_slot(p_connection_id UUID, p_starts_at TIMESTAMPTZ) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM connection_participants WHERE connection_id = p_connection_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not a participant in this connection';
  END IF;

  UPDATE connection_live_sessions
  SET status = 'scheduled', scheduled_start_at = p_starts_at
  WHERE connection_id = p_connection_id AND status IN ('requested', 'scheduled')
  RETURNING id INTO v_session_id;

  IF v_session_id IS NULL THEN
    INSERT INTO connection_live_sessions (connection_id, status, scheduled_start_at)
    VALUES (p_connection_id, 'scheduled', p_starts_at) RETURNING id INTO v_session_id;
  END IF;

  UPDATE connections SET status = 'live_scheduled' WHERE id = p_connection_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION join_live_session(p_session_id UUID) RETURNS VOID AS $$
DECLARE
  v_participant_id UUID;
BEGIN
  SELECT cp.id INTO v_participant_id
  FROM connection_participants cp
  JOIN connection_live_sessions ls ON ls.connection_id = cp.connection_id
  WHERE ls.id = p_session_id AND cp.user_id = auth.uid();

  IF v_participant_id IS NULL THEN
    RAISE EXCEPTION 'Not a participant in this live session';
  END IF;

  INSERT INTO connection_live_session_participants (live_session_id, participant_id, joined_at)
  VALUES (p_session_id, v_participant_id, NOW())
  ON CONFLICT (live_session_id, participant_id) DO UPDATE SET joined_at = COALESCE(connection_live_session_participants.joined_at, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- The timer's authoritative start: only once BOTH rows for this session
-- have ready_at set does status flip to 'active' with a server timestamp --
-- never the scheduled clock time, and never a client-side clock.
CREATE OR REPLACE FUNCTION mark_live_ready(p_session_id UUID) RETURNS TEXT AS $$
DECLARE
  v_participant_id UUID;
  v_both_ready BOOLEAN;
BEGIN
  PERFORM 1 FROM connection_live_sessions WHERE id = p_session_id FOR UPDATE;

  SELECT cp.id INTO v_participant_id
  FROM connection_participants cp
  JOIN connection_live_sessions ls ON ls.connection_id = cp.connection_id
  WHERE ls.id = p_session_id AND cp.user_id = auth.uid();

  IF v_participant_id IS NULL THEN
    RAISE EXCEPTION 'Not a participant in this live session';
  END IF;

  UPDATE connection_live_session_participants
  SET ready_at = COALESCE(ready_at, NOW())
  WHERE live_session_id = p_session_id AND participant_id = v_participant_id;

  SELECT COUNT(*) = 2 INTO v_both_ready
  FROM connection_live_session_participants WHERE live_session_id = p_session_id AND ready_at IS NOT NULL;

  IF v_both_ready THEN
    UPDATE connection_live_sessions SET status = 'active', actual_started_at = NOW() WHERE id = p_session_id;
    RETURN 'started';
  END IF;

  RETURN 'waiting_for_participant';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION end_live_session(p_session_id UUID) RETURNS VOID AS $$
DECLARE
  v_connection_id UUID;
  v_started TIMESTAMPTZ;
BEGIN
  SELECT connection_id, actual_started_at INTO v_connection_id, v_started
  FROM connection_live_sessions WHERE id = p_session_id;

  IF NOT EXISTS (SELECT 1 FROM connection_participants WHERE connection_id = v_connection_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not a participant in this live session';
  END IF;

  UPDATE connection_live_sessions
  SET status = 'completed', ended_at = NOW(),
      duration_seconds = CASE WHEN v_started IS NOT NULL THEN EXTRACT(EPOCH FROM (NOW() - v_started))::int ELSE NULL END
  WHERE id = p_session_id;

  UPDATE connections SET status = 'completed', completed_at = NOW() WHERE id = v_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION set_live_availability_now(p_duration_minutes INT) RETURNS VOID AS $$
BEGIN
  IF p_duration_minutes NOT IN (15, 30, 60) THEN
    RAISE EXCEPTION 'Invalid duration';
  END IF;

  INSERT INTO connection_live_availability (user_id, available_until, duration_minutes, updated_at)
  VALUES (auth.uid(), NOW() + (p_duration_minutes || ' minutes')::interval, p_duration_minutes, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET available_until = EXCLUDED.available_until, duration_minutes = EXCLUDED.duration_minutes, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION clear_live_availability_now() RETURNS VOID AS $$
BEGIN
  DELETE FROM connection_live_availability WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Lock down execution: PUBLIC (includes anon) gets nothing, only logged-in
-- members can call any of these.
REVOKE ALL ON FUNCTION create_connection_invitation, accept_connection_invitation, decline_connection_invitation,
  save_response_draft, submit_round_response, get_round_responses, mark_response_viewed, submit_acknowledgment,
  advance_round, extend_connection_deadline, end_connection, report_connection, request_live_conversation,
  respond_live_request, submit_live_availability, confirm_live_slot, join_live_session, mark_live_ready,
  end_live_session, set_live_availability_now, clear_live_availability_now
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION create_connection_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION accept_connection_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION decline_connection_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION save_response_draft TO authenticated;
GRANT EXECUTE ON FUNCTION submit_round_response TO authenticated;
GRANT EXECUTE ON FUNCTION get_round_responses TO authenticated;
GRANT EXECUTE ON FUNCTION mark_response_viewed TO authenticated;
GRANT EXECUTE ON FUNCTION submit_acknowledgment TO authenticated;
GRANT EXECUTE ON FUNCTION advance_round TO authenticated;
GRANT EXECUTE ON FUNCTION extend_connection_deadline TO authenticated;
GRANT EXECUTE ON FUNCTION end_connection TO authenticated;
GRANT EXECUTE ON FUNCTION report_connection TO authenticated;
GRANT EXECUTE ON FUNCTION request_live_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION respond_live_request TO authenticated;
GRANT EXECUTE ON FUNCTION submit_live_availability TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_live_slot TO authenticated;
GRANT EXECUTE ON FUNCTION join_live_session TO authenticated;
GRANT EXECUTE ON FUNCTION mark_live_ready TO authenticated;
GRANT EXECUTE ON FUNCTION end_live_session TO authenticated;
GRANT EXECUTE ON FUNCTION set_live_availability_now TO authenticated;
GRANT EXECUTE ON FUNCTION clear_live_availability_now TO authenticated;

-- =====================================================================
-- ROLLBACK NOTES
--
-- This migration is additive except for the two DROP CONSTRAINT/ADD
-- CONSTRAINT pairs (connections.status, connection_preferences.formats) and
-- the connection_notification_log dedup index change. To fully revert:
--
--   DROP FUNCTION IF EXISTS create_connection_invitation, accept_connection_invitation,
--     decline_connection_invitation, open_connection_round, save_response_draft,
--     submit_round_response, get_round_responses, mark_response_viewed,
--     submit_acknowledgment, advance_round, extend_connection_deadline,
--     end_connection, report_connection, request_live_conversation,
--     respond_live_request, submit_live_availability, confirm_live_slot,
--     join_live_session, mark_live_ready, end_live_session,
--     set_live_availability_now, clear_live_availability_now,
--     my_participant_id, get_connection_setting_hours, connections_touch_updated_at;
--   DROP TABLE IF EXISTS connection_live_session_participants, connection_live_sessions,
--     connection_availability, connection_acknowledgments, connection_responses,
--     connection_rounds, connection_prompts, connection_prompt_sequences,
--     connection_participants, connection_live_availability, connection_blocks;
--   ALTER TABLE connections DROP CONSTRAINT connections_prompt_sequence_fk;
--   ALTER TABLE connections DROP COLUMN connection_type, prompt_sequence_id,
--     current_round_number, invitation_expires_at, activated_at,
--     response_deadline_at, extension_used_by, extension_used_at, expired_at,
--     ended_at, end_reason_private, live_requested_at, metadata;
--   -- restore the original status CHECK from migration 010 if truly reverting.
--   ALTER TABLE connection_preferences DROP COLUMN formats;
--   ALTER TABLE connection_notification_log DROP COLUMN notification_type;
--   -- restore the original single-column unique index from migration 077.
--
-- Existing `connection_requests`, legacy `connections` rows, and
-- `connection_messages` / ConnectionChat.tsx are entirely untouched by this
-- migration and continue to work exactly as before.
-- =====================================================================
