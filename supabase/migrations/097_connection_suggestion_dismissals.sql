-- 097: Simplify Connections, phase 4 -- "Someone You Might Want to Know" /
-- "Your Connection of the Week" dismissal tracking.
--
-- Just one table: a suggestion is computed on demand by
-- /api/connections/suggestions (simple, explainable signals -- shared
-- interests/spaces/connection_intentions overlap, no ML, per the plan),
-- and this table only remembers "don't show me this person again for a
-- while" once someone clicks "Not this one". No caching/scheduling table
-- is needed for the weekly pick either -- it's derived deterministically
-- from (user_id, ISO week number) at read time, so nothing needs to be
-- precomputed or stored.

CREATE TABLE IF NOT EXISTS connection_suggestion_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, dismissed_user_id)
);

ALTER TABLE connection_suggestion_dismissals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_connection_suggestion_dismissals_user ON connection_suggestion_dismissals(user_id);

DROP POLICY IF EXISTS "Users can view their own dismissals" ON connection_suggestion_dismissals;
CREATE POLICY "Users can view their own dismissals"
  ON connection_suggestion_dismissals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own dismissals" ON connection_suggestion_dismissals;
CREATE POLICY "Users can create their own dismissals"
  ON connection_suggestion_dismissals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own dismissals" ON connection_suggestion_dismissals;
CREATE POLICY "Users can update their own dismissals"
  ON connection_suggestion_dismissals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- ROLLBACK NOTES
--
-- DROP TABLE IF EXISTS connection_suggestion_dismissals;
--
-- New table only -- no existing table or migration is modified.
-- =====================================================================
