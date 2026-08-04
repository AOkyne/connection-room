-- Minimum metadata needed to power an admin "newsletter segment
-- generator" for Question of the Week: which questions are currently
-- active/eligible, and a real FK from a scheduled question back to the
-- actual post the weekly-prompts cron created for it.
--
-- Deliberately not duplicating anything posts/space_weekly_prompts
-- already track: "this week's featured post" is still posts.pinned,
-- prompt_id is still the space_id:week_number join key for the cron's
-- own idempotency checks -- this migration only adds what's missing.

ALTER TABLE space_weekly_prompts
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'archived'
    CHECK (status IN ('scheduled', 'active', 'archived')),
  ADD COLUMN IF NOT EXISTS week_start_date DATE,
  ADD COLUMN IF NOT EXISTS week_end_date DATE,
  ADD COLUMN IF NOT EXISTS newsletter_eligible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS newsletter_display_order INTEGER,
  ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES posts(id) ON DELETE SET NULL;

-- Backfill post_id for weeks the cron has already posted, using the
-- existing prompt_id string convention ('weekly:{spaceId}:{weekNumber}')
-- as the join key -- this is the only place that convention was ever
-- recorded prior to this migration.
UPDATE space_weekly_prompts swp
SET post_id = p.id
FROM posts p
WHERE p.prompt_id = 'weekly:' || swp.space_id || ':' || swp.week_number
  AND swp.post_id IS NULL;

-- Backfill status: the currently-pinned post per space marks its
-- matching week_number row 'active'; everything else with a linked post
-- (already posted in a prior week) is 'archived' (the column default),
-- so no explicit UPDATE needed for those. Rows with no linked post stay
-- 'archived' too until the cron actually posts them and the route (see
-- app/api/cron/weekly-prompts/route.ts) sets 'active' going forward.
UPDATE space_weekly_prompts swp
SET status = 'active'
FROM posts p
WHERE p.id = swp.post_id AND p.pinned = true;

CREATE INDEX IF NOT EXISTS space_weekly_prompts_status_idx
  ON space_weekly_prompts (status) WHERE status = 'active';

-- =====================================================================
-- ROLLBACK NOTES
--
-- ALTER TABLE space_weekly_prompts
--   DROP COLUMN IF EXISTS status,
--   DROP COLUMN IF EXISTS week_start_date,
--   DROP COLUMN IF EXISTS week_end_date,
--   DROP COLUMN IF EXISTS newsletter_eligible,
--   DROP COLUMN IF EXISTS newsletter_display_order,
--   DROP COLUMN IF EXISTS post_id;
--
-- All additive/nullable-or-defaulted. Does not touch posts, the cron
-- route's existing pinned/prompt_id logic, or migrations 001-088.
-- =====================================================================
