-- Found while investigating "the unread new-post count never clears even
-- though I've opened my spaces": space_memberships has SELECT, INSERT, and
-- DELETE policies for its owner (migration 001), but no UPDATE policy at
-- all -- confirmed live, an authenticated member's own anon-key client
-- updating their own last_visited_at on their own row matches 0 rows and
-- returns no error (Postgres RLS silently filters out rows the caller
-- can't touch; PostgREST doesn't treat 0-rows-matched as a failure). So
-- updateSpaceVisit()/updateAllSpaceVisits() (lib/data/supabase-spaces.ts)
-- have never actually persisted a single write, for any real member,
-- since this column was added in migration 005 -- every "new posts since
-- last visit" badge has been counting from whatever last_visited_at was
-- set to at the moment the member joined the space, forever.
CREATE POLICY "Users can update their own space membership"
  ON space_memberships FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- ROLLBACK NOTES
--
-- Dropping this policy silently restores the original bug: last_visited_at
-- writes go back to no-op'ing forever, and every space's "new post" badge
-- never clears again for any real member.
-- =====================================================================
