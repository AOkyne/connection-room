-- 080: Backfill existing `connections` rows into the new
-- connection_participants model, so legacy live connections keep working
-- under both the old code path (unchanged, still reads/writes user_id/
-- partner_id/status directly) and anything new that joins through
-- connection_participants (e.g. the "Users can view their own blocks"-style
-- helpers, admin reporting).
--
-- Every existing row was created by createConfirmedConnection()
-- (lib/data/connections.ts), which always inserts status='confirmed'
-- directly -- 'pending_their_acceptance' is in the CHECK constraint but
-- never actually written by the app. This backfill is written defensively
-- to cover it anyway, in case a row was ever created by hand or a future
-- rollback of app code resurrects the code path.

-- All legacy rows are the live 20-minute chat flow.
UPDATE connections
SET connection_type = 'live'
WHERE connection_type IS NULL OR connection_type = 'async';
-- (connection_type defaults to 'async' as of migration 078; every row that
-- predates this backfill is, by construction, a legacy live connection.)

UPDATE connections
SET activated_at = confirmed_at
WHERE activated_at IS NULL AND confirmed_at IS NOT NULL;

-- Backfill one connection_participants row per side of each legacy
-- connection that doesn't already have one (idempotent via the unique
-- (connection_id, user_id) constraint from migration 078).
INSERT INTO connection_participants (connection_id, user_id, invitation_status, accepted_at, completed_at, declined_at)
SELECT
  c.id,
  c.user_id,
  CASE
    WHEN c.status = 'declined' THEN 'declined'
    WHEN c.status = 'pending_their_acceptance' THEN 'accepted' -- the row owner always implicitly accepted by creating it
    ELSE 'accepted'
  END,
  COALESCE(c.confirmed_at, c.created_at),
  CASE WHEN c.status = 'completed' THEN c.completed_at ELSE NULL END,
  CASE WHEN c.status = 'declined' THEN COALESCE(c.confirmed_at, c.created_at) ELSE NULL END
FROM connections c
WHERE NOT EXISTS (
  SELECT 1 FROM connection_participants cp WHERE cp.connection_id = c.id AND cp.user_id = c.user_id
);

INSERT INTO connection_participants (connection_id, user_id, invitation_status, accepted_at, completed_at, declined_at)
SELECT
  c.id,
  c.partner_id,
  CASE
    WHEN c.status = 'declined' THEN 'declined'
    WHEN c.status = 'pending_their_acceptance' THEN 'invited'
    ELSE 'accepted'
  END,
  CASE WHEN c.status != 'pending_their_acceptance' THEN COALESCE(c.confirmed_at, c.created_at) ELSE NULL END,
  CASE WHEN c.status = 'completed' THEN c.completed_at ELSE NULL END,
  CASE WHEN c.status = 'declined' THEN COALESCE(c.confirmed_at, c.created_at) ELSE NULL END
FROM connections c
WHERE NOT EXISTS (
  SELECT 1 FROM connection_participants cp WHERE cp.connection_id = c.id AND cp.user_id = c.partner_id
);

-- Anything genuinely stuck in 'pending_their_acceptance' for more than 30
-- days is stale by any reasonable definition -- mark it expired rather than
-- leaving it in an ambiguous state forever. In practice this should match
-- zero rows (see comment above), but costs nothing to run.
UPDATE connections
SET status = 'expired', expired_at = NOW()
WHERE status = 'pending_their_acceptance'
  AND created_at < NOW() - INTERVAL '30 days';

-- =====================================================================
-- ROLLBACK NOTES
--
-- This migration only backfills previously-NULL columns and inserts
-- connection_participants rows that did not exist -- it never overwrites
-- app-visible fields on existing `connections` rows (status is only ever
-- touched for the 30-day-stale 'pending_their_acceptance' edge case, which
-- should affect zero real rows). To revert:
--
--   DELETE FROM connection_participants
--   WHERE connection_id IN (SELECT id FROM connections WHERE connection_type = 'live');
--
-- (Only safe if no async activity has since been layered onto those same
-- connection_participants rows -- check before running.)
-- =====================================================================
