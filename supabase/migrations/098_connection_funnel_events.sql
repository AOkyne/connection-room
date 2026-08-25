-- 098: Simplify Connections, phase 5 -- funnel analytics for the new
-- discovery -> say hello -> conversation flow. Same narrow, purpose-built
-- pattern as newsletter_events (migration 090) -- no general-purpose
-- analytics_events table exists in this app, and this isn't meant to
-- become one. No message/content column exists on this table at all --
-- "never store private message content in analytics" is enforced by the
-- schema itself, not just convention in the calling code.

CREATE TABLE IF NOT EXISTS connection_funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'connections_directory_viewed',
    'member_card_viewed',
    'member_profile_opened_from_connections',
    'say_hello_clicked',
    'suggested_starter_selected',
    'first_message_sent',
    'first_reply_received',
    'conversation_starter_requested',
    'suggested_member_shown',
    'suggested_member_dismissed',
    'suggested_member_messaged'
  )),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES connections(id) ON DELETE SET NULL,
  filter TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS connection_funnel_events_type_idx ON connection_funnel_events (event_type, created_at);
CREATE INDEX IF NOT EXISTS connection_funnel_events_user_idx ON connection_funnel_events (user_id);

ALTER TABLE connection_funnel_events ENABLE ROW LEVEL SECURITY;

-- Insert-only, own rows only -- Connections requires sign-in for
-- everything this tracks, so unlike newsletter_events there's no
-- signed-out/anon case to allow for. No SELECT policy for regular
-- members; an admin funnel summary (future work, not built in this
-- migration) would read via the service-role key like every other
-- admin-only aggregate in this app.
CREATE POLICY "connection_funnel_events_insert_own"
  ON connection_funnel_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- ROLLBACK NOTES
--
-- DROP TABLE IF EXISTS connection_funnel_events;
--
-- New table only -- does not touch any existing table or migrations
-- 001-097.
-- =====================================================================
