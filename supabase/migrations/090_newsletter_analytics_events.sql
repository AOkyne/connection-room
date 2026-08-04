-- Minimal internal event table for newsletter deep-link tracking. No
-- event-tracking table exists anywhere else in this app (admin analytics
-- in lib/admin/analytics.ts is all on-demand queries against real
-- domain tables) -- this is a small, purpose-built addition rather than
-- a general analytics pipeline, per the feature spec's explicit
-- allowance for one.
--
-- No response/comment content column exists on this table anywhere --
-- "never store response content in analytics" is enforced by the schema
-- itself, not just by convention in the calling code.

CREATE TABLE IF NOT EXISTS newsletter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'newsletter_question_viewed',
    'question_response_started',
    'question_response_submitted',
    'question_reply_started',
    'question_reply_submitted'
  )),
  question_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  space_id TEXT REFERENCES spaces(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL = signed-out arrival
  campaign TEXT,
  source TEXT,
  signed_in_on_arrival BOOLEAN NOT NULL DEFAULT false,
  is_reply BOOLEAN, -- NULL for viewed events; true/false for response/reply events
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS newsletter_events_question_type_idx
  ON newsletter_events (question_post_id, event_type);
CREATE INDEX IF NOT EXISTS newsletter_events_created_at_idx
  ON newsletter_events (created_at);

ALTER TABLE newsletter_events ENABLE ROW LEVEL SECURITY;

-- Anon (not just authenticated) can insert: a signed-out newsletter click
-- fires 'newsletter_question_viewed' (signed_in_on_arrival = false)
-- BEFORE the app-level redirect to /auth happens, per item 6's
-- "signed-in-on-arrival" property -- if this table only accepted
-- authenticated inserts, that specific case (the whole point of tracking
-- it) could never be recorded, since a signed-out visitor never reaches
-- an authenticated Supabase session on that pageview. Anon rows are
-- constrained to user_id IS NULL so an anonymous caller can't attribute
-- an event to someone else's account; a signed-in caller may only use
-- their own auth.uid() or NULL. These rows carry no sensitive data
-- either way. No SELECT policy for regular users -- the admin summary
-- (lib/admin/analytics.ts getNewsletterQuestionStats) reads via the
-- service-role key in an admin-gated API route, same pattern as every
-- other admin-only aggregate table in this app.
CREATE POLICY "newsletter_events_insert_public"
  ON newsletter_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- =====================================================================
-- ROLLBACK NOTES
--
-- DROP TABLE IF EXISTS newsletter_events;
--
-- New table only -- does not touch any existing table or migrations
-- 001-089.
-- =====================================================================
