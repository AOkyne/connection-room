-- 070: Saved drafts for the admin Broadcast Email composer.
--
-- Reported gap: composing a broadcast is all-or-nothing -- close the tab
-- partway through and the subject/body/recipient selection is gone.
-- Scoped per-admin (admin_user_id) rather than shared across all admins:
-- if a second admin account is ever added, each admin's in-progress drafts
-- stay their own rather than showing up as a shared pool.
CREATE TABLE IF NOT EXISTS broadcast_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  recipient_mode TEXT NOT NULL DEFAULT 'all' CHECK (recipient_mode IN ('all', 'select')),
  recipient_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_drafts_admin_updated
  ON broadcast_drafts (admin_user_id, updated_at DESC);

-- Service-role only, same convention as sent_emails/drip_emails_sent: all
-- reads and writes go through admin API routes gated by requireAdmin(),
-- never a direct client policy.
ALTER TABLE broadcast_drafts ENABLE ROW LEVEL SECURITY;
