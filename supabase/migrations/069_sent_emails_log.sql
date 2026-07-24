-- 069: A single log of every real outbound email the app has sent.
--
-- Reported gap: no history exists anywhere of what was sent, when, or to
-- whom. Two narrow precedents already exist (drip_emails_sent, migration
-- 020; notification_log, migration 054), but both were built purely to
-- prevent double-sends for their own one feature -- neither covers welcome
-- emails, digests, admin broadcasts, or direct admin-to-member emails, and
-- neither is meant to be browsed as a history. This table is the first one
-- that's actually general-purpose and admin-facing.
--
-- recipient_user_id (not profiles.id) to match notification_log's existing
-- convention, and because every real call site already has a user_id in
-- scope at the point of sending (some don't have profiles.id without an
-- extra query). ON DELETE SET NULL rather than CASCADE: a deleted member's
-- past emails should stay in the history (what was actually sent still
-- happened), just without a live link back to a row that no longer exists.
CREATE TABLE IF NOT EXISTS sent_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  to_email TEXT NOT NULL,
  cc_email TEXT,
  subject TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON sent_emails (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sent_emails_to_email ON sent_emails (to_email);
CREATE INDEX IF NOT EXISTS idx_sent_emails_category ON sent_emails (category);

-- Service-role only, same as drip_emails_sent/notification_log: written by
-- server-side API routes/cron with the service role key, read by the new
-- admin email-history API route (also service-role, gated by requireAdmin())
-- -- no policies needed for either direction, and no member should ever be
-- able to read another member's email history.
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;
