-- 103: Keep a copy of each broadcast's content, for "Use again".
--
-- sent_emails records who got each broadcast and its subject, but never
-- the body -- and the draft is deleted once it's sent -- so a sent email
-- could not be reopened, edited and resent. One row per broadcast
-- (keyed by the same broadcast_batch_id every sent_emails row of that
-- send carries, migration 095), written by the admin send route itself
-- on the first chunk of the send.
--
-- body_html is the composer's HTML as sent, before per-recipient
-- tracking/poll-link rewriting, so reusing it behaves exactly like
-- composing it fresh.
--
-- Admin-only, and only ever read/written by admin API routes on the
-- service-role key: RLS on with no policies, grants to service_role only
-- (see migration 100's note on explicit grants for new tables).
--
-- ROLLBACK:
-- DROP TABLE IF EXISTS broadcast_campaign_contents;

CREATE TABLE IF NOT EXISTS broadcast_campaign_contents (
  broadcast_batch_id UUID PRIMARY KEY,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE broadcast_campaign_contents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON broadcast_campaign_contents FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON broadcast_campaign_contents TO service_role;
