-- Timestamp of when a member completed onboarding, used to schedule the
-- automated 5/14/30-day drip email sequence. NULL for members who
-- completed onboarding before this column existed — they are
-- intentionally not retroactively enrolled.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Records which drip emails have already been sent to which member, so
-- the daily cron job never sends the same email twice.
CREATE TABLE IF NOT EXISTS drip_emails_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_key TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, email_key)
);
