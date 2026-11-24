-- 108: Save My Journey progress and private reflections to members' accounts.
--
-- The First Week doors and the weekly Guided Rhythm wrote to
-- first_week_journey_progress / guided_rhythm_progress, but the live tables
-- have a different layout (door_number/completed rows), so every save failed
-- and the app silently kept the data only in that browser's localStorage.
-- This table holds each member's progress as JSON -- including the private
-- reflections and intentions they write -- readable and writable only by
-- that member (and the service role).
--
-- ROLLBACK: DROP TABLE IF EXISTS member_journey_progress;

CREATE TABLE IF NOT EXISTS member_journey_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_week JSONB,
  guided_rhythm JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE member_journey_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read own journey" ON member_journey_progress;
DROP POLICY IF EXISTS "Members add own journey" ON member_journey_progress;
DROP POLICY IF EXISTS "Members update own journey" ON member_journey_progress;
DROP POLICY IF EXISTS "Members delete own journey" ON member_journey_progress;

CREATE POLICY "Members read own journey" ON member_journey_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members add own journey" ON member_journey_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members update own journey" ON member_journey_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members delete own journey" ON member_journey_progress
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Explicit grants are required for new tables (see migration 100).
REVOKE ALL ON member_journey_progress FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON member_journey_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON member_journey_progress TO service_role;

-- Close the old "anyone can read" rules from migration 009 on the unused
-- progress tables, so nothing written there could ever be read by others.
DROP POLICY IF EXISTS "first_week_journey_progress_public_read" ON first_week_journey_progress;
DROP POLICY IF EXISTS "guided_rhythm_progress_public_read" ON guided_rhythm_progress;

-- Show the access rules now on the private-reflection tables, so they can be
-- checked: every row should be limited to the member's own rows.
SELECT tablename, policyname, cmd, roles::text, qual, with_check
FROM pg_policies
WHERE tablename IN ('member_journey_progress', 'user_reflections', 'first_week_journey_progress', 'guided_rhythm_progress')
ORDER BY tablename, policyname;
