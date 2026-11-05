-- 107: The Lento Room -- a private group chat opened from the Lento app.
--
-- People enter only through a one-time signed pass from the Lento app
-- (/enter?pass=...). The pass carries a random per-person id (`sub`) and the
-- rooms it opens; nothing else about them. The room stores only a SHA-256 hash of
-- that id, the display name they choose here, and what they post.
--
-- Isolation: every table is service-role only (RLS on, no policies, no
-- grants to anon/authenticated -- explicit grants are required for new
-- tables, see migration 100). Browsers never query these tables, so a
-- normal Connection Room login cannot read room content; every request
-- goes through /api/lento-room/*, which checks the Lento room session.
--
-- No membership list: Lento decides eligibility each time it issues a
-- pass. lento_room_members is only the pseudonymous identity (display
-- name, preferences), created on first entry.
--
-- ROLLBACK:
-- DROP TABLE IF EXISTS lento_room_entry_events, lento_room_reports, lento_room_follows,
--   lento_room_reactions, lento_room_publications, lento_room_messages, lento_room_prompts,
--   lento_room_members, lento_room_settings, lento_pass_redemptions;

-- One row per redeemed pass (hash of its jti), kept until shortly after the
-- pass would have expired anyway; expired rows are deleted on later entries.
CREATE TABLE IF NOT EXISTS lento_pass_redemptions (
  jti_hash TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS lento_pass_redemptions_expires_idx ON lento_pass_redemptions (expires_at);

CREATE TABLE IF NOT EXISTS lento_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- sha256(sub) for Lento entrants; sha256('host:' || auth user id) for the host.
  sub_hash TEXT NOT NULL UNIQUE,
  display_name TEXT,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  welcomed_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  last_entry_at TIMESTAMPTZ,
  restricted_at TIMESTAMPTZ,
  notify_replies BOOLEAN NOT NULL DEFAULT TRUE,
  notify_followed BOOLEAN NOT NULL DEFAULT TRUE,
  notify_topics BOOLEAN NOT NULL DEFAULT TRUE,
  notify_digest BOOLEAN NOT NULL DEFAULT FALSE,
  notified_through TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lento_room_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_id TEXT UNIQUE,
  slot TEXT NOT NULL CHECK (slot IN ('weekly', 'midweek', 'learning')),
  category TEXT NOT NULL,
  body TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  times_published INT NOT NULL DEFAULT 0,
  last_published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lento_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL for automated prompts (never shown as a member).
  member_id UUID REFERENCES lento_room_members(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('message', 'checkin', 'question', 'prompt')),
  -- Replies point at a top-level message; one level of threading.
  parent_id UUID REFERENCES lento_room_messages(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  mood TEXT,
  wants TEXT CHECK (wants IS NULL OR wants IN ('sharing', 'experiences')),
  prompt_id UUID REFERENCES lento_room_prompts(id) ON DELETE SET NULL,
  prompt_slot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS lento_room_messages_top_idx ON lento_room_messages (created_at) WHERE parent_id IS NULL;
CREATE INDEX IF NOT EXISTS lento_room_messages_parent_idx ON lento_room_messages (parent_id, created_at);
CREATE INDEX IF NOT EXISTS lento_room_messages_member_idx ON lento_room_messages (member_id, created_at);

CREATE TABLE IF NOT EXISTS lento_room_reactions (
  message_id UUID NOT NULL REFERENCES lento_room_messages(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES lento_room_members(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('relate', 'thanks', 'with_you')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, member_id, kind)
);

-- Threads a member follows (their own posts, and any they reply to).
CREATE TABLE IF NOT EXISTS lento_room_follows (
  message_id UUID NOT NULL REFERENCES lento_room_messages(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES lento_room_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, member_id)
);

-- Each scheduled slot publishes once per local date, however often the job runs.
CREATE TABLE IF NOT EXISTS lento_room_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES lento_room_prompts(id) ON DELETE SET NULL,
  slot TEXT NOT NULL,
  scheduled_for DATE,
  manual BOOLEAN NOT NULL DEFAULT FALSE,
  message_id UUID REFERENCES lento_room_messages(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS lento_room_publications_once_idx
  ON lento_room_publications (slot, scheduled_for) WHERE NOT manual;

CREATE TABLE IF NOT EXISTS lento_room_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  -- day: 0 = Sunday ... 6 = Saturday; hour: local 0-23
  schedule JSONB NOT NULL DEFAULT '{"weekly":{"day":1,"hour":9,"enabled":true},"midweek":{"day":3,"hour":9,"enabled":true},"learning":{"day":5,"hour":9,"enabled":true}}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO lento_room_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS lento_room_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES lento_room_messages(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES lento_room_members(id) ON DELETE SET NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution TEXT
);

-- Entry outcomes only (no tokens, ids or request details), for the admin
-- "access diagnostics" panel.
CREATE TABLE IF NOT EXISTS lento_room_entry_events (
  id BIGSERIAL PRIMARY KEY,
  outcome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lento_room_entry_events_created_idx ON lento_room_entry_events (created_at);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'lento_pass_redemptions', 'lento_room_members', 'lento_room_prompts', 'lento_room_messages',
    'lento_room_reactions', 'lento_room_follows', 'lento_room_publications', 'lento_room_settings',
    'lento_room_reports', 'lento_room_entry_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO service_role', t);
  END LOOP;
END $$;

GRANT USAGE, SELECT ON SEQUENCE lento_room_entry_events_id_seq TO service_role;
