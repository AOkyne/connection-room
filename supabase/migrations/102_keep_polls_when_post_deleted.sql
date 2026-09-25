-- 102: Deleting a poll's space post no longer deletes the poll.
--
-- polls.post_id was ON DELETE CASCADE (migration 099), so removing the
-- space post that carried a broadcast poll silently deleted the poll, its
-- options and every vote -- and with them, every vote link already sitting
-- in members' inboxes (confirmed live 2026-09-25: a poll emailed to 131
-- members had no rows left, so each tap fell through to the app home
-- page / sign-in screen instead of recording a vote).
--
-- SET NULL instead: the poll lives on as an email-only poll (results,
-- votes and email links all keep working); it just no longer appears in a
-- space.
--
-- ROLLBACK:
-- ALTER TABLE polls DROP CONSTRAINT IF EXISTS polls_post_id_fkey;
-- ALTER TABLE polls ADD CONSTRAINT polls_post_id_fkey
--   FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE polls DROP CONSTRAINT IF EXISTS polls_post_id_fkey;
ALTER TABLE polls ADD CONSTRAINT polls_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL;
