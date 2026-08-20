-- Open/click tracking for sent emails, and a batch id so every
-- per-recipient row from one broadcast send can be aggregated back into
-- a single "campaign" for the admin Email History page.
--
-- broadcast_batch_id is nullable and only ever set by the broadcast-send
-- route (app/api/admin/broadcast-email/route.ts) -- automated emails
-- (welcome, digests, notifications) have no concept of a "campaign" and
-- leave it null.
--
-- opened_at/clicked_at record the FIRST open/click only (open_count/
-- click_count track repeats) -- "did this recipient ever open/click" is
-- the number that actually matters for a rate; a recipient opening the
-- same email five times shouldn't inflate an open-rate percentage.

ALTER TABLE sent_emails
  ADD COLUMN IF NOT EXISTS broadcast_batch_id UUID,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS open_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sent_emails_broadcast_batch_id ON sent_emails (broadcast_batch_id);

-- =====================================================================
-- ROLLBACK NOTES
--
-- DROP INDEX IF EXISTS idx_sent_emails_broadcast_batch_id;
-- ALTER TABLE sent_emails
--   DROP COLUMN IF EXISTS broadcast_batch_id,
--   DROP COLUMN IF EXISTS opened_at,
--   DROP COLUMN IF EXISTS open_count,
--   DROP COLUMN IF EXISTS clicked_at,
--   DROP COLUMN IF EXISTS click_count;
--
-- All additive/nullable-or-defaulted -- no data loss, no change to
-- existing rows' meaning. Does not modify migrations 001-094.
-- =====================================================================
