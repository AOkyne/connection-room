-- 099: Polls -- attachable to a Spaces post, and/or embeddable in a
-- broadcast email as plain links (email can't run JS). One unified
-- schema serves both: `polls.post_id` is nullable, set whenever a poll
-- is attached to a space post (created there directly, or created from
-- the broadcast composer with "also post to a space" chosen) and left
-- NULL for a broadcast-only poll with no space presence.
--
-- DESIGN:
--
-- 1. No new column on `posts` -- every existing post "kind" in this app
--    is convention-based (prompt_id string prefix for QOTW, a pinned
--    boolean), never a discriminator column. A poll attaches to a post
--    the same way: check whether a polls row references it, same as
--    checking prompt_id today.
--
-- 2. All writes go through SECURITY DEFINER RPCs, mirroring migration
--    078's connections convention -- never a raw client insert on any of
--    these three tables. This is what makes the email-vote path safe:
--    there is no logged-in browser session at all when someone clicks a
--    poll link inside an email client, so that path can't use an
--    auth.uid()-based RPC the way the Spaces vote button does. Instead,
--    submit_poll_vote_as() takes an explicit user id and is granted ONLY
--    to service_role -- an ordinary authenticated client can never call
--    it to vote as someone else, only the poll-vote API route (running
--    with the service-role key, same trust boundary as the existing
--    open/click tracking routes) can.
--
-- 3. Individual ballots are never selectable by regular members, even
--    their own via a raw SELECT -- poll_votes has no member-facing SELECT
--    policy at all. Results (aggregate counts + "is this my vote") are
--    read only through get_poll_results(), the same masking principle as
--    get_round_responses() stripping draft_text in migration 078.
--
-- ROLLBACK NOTES are at the bottom of the file.

-- =====================================================================
-- 1. Tables
-- =====================================================================

CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_polls_post_id ON polls(post_id);

CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  "position" INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);

CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 2. RLS -- SELECT only, matching posts_select_authenticated's own
--    tightening (migration 075). No INSERT/UPDATE/DELETE policy on any
--    of these three tables for any client role; every write is RPC-only.
-- =====================================================================

DROP POLICY IF EXISTS "polls_select_authenticated" ON polls;
CREATE POLICY "polls_select_authenticated"
  ON polls FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "poll_options_select_authenticated" ON poll_options;
CREATE POLICY "poll_options_select_authenticated"
  ON poll_options FOR SELECT
  TO authenticated
  USING (true);

-- Deliberately no SELECT policy on poll_votes at all -- individual
-- ballots are private; only get_poll_results() (below) may read this
-- table, via its SECURITY DEFINER privilege bypassing RLS.

-- =====================================================================
-- 3. RPCs
-- =====================================================================

CREATE OR REPLACE FUNCTION create_poll_with_options(
  p_question TEXT,
  p_options TEXT[],
  p_post_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_poll_id UUID;
  v_option TEXT;
  v_position INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_question IS NULL OR length(trim(p_question)) = 0 THEN
    RAISE EXCEPTION 'A poll needs a question';
  END IF;

  IF p_options IS NULL OR array_length(p_options, 1) < 2 THEN
    RAISE EXCEPTION 'A poll needs at least two options';
  END IF;

  INSERT INTO polls (post_id, question, created_by)
  VALUES (p_post_id, p_question, auth.uid())
  RETURNING id INTO v_poll_id;

  FOREACH v_option IN ARRAY p_options LOOP
    INSERT INTO poll_options (poll_id, label, "position")
    VALUES (v_poll_id, v_option, v_position);
    v_position := v_position + 1;
  END LOOP;

  RETURN v_poll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Web path: the voter is the caller's own real session.
CREATE OR REPLACE FUNCTION submit_poll_vote(p_poll_id UUID, p_option_id UUID) RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM poll_options WHERE id = p_option_id AND poll_id = p_poll_id) THEN
    RAISE EXCEPTION 'This option does not belong to this poll';
  END IF;

  INSERT INTO poll_votes (poll_id, option_id, user_id)
  VALUES (p_poll_id, p_option_id, auth.uid())
  ON CONFLICT (poll_id, user_id) DO UPDATE
    SET option_id = EXCLUDED.option_id, voted_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Email path: there is no browser session at all when a poll link is
-- clicked from an email client -- the caller (the poll-vote API route,
-- using the service-role key) supplies the voter's identity explicitly,
-- resolved server-side from sent_emails.recipient_user_id, never from
-- anything in the URL a recipient could edit. Locked to service_role only.
CREATE OR REPLACE FUNCTION submit_poll_vote_as(p_user_id UUID, p_poll_id UUID, p_option_id UUID) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM poll_options WHERE id = p_option_id AND poll_id = p_poll_id) THEN
    RAISE EXCEPTION 'This option does not belong to this poll';
  END IF;

  INSERT INTO poll_votes (poll_id, option_id, user_id)
  VALUES (p_poll_id, p_option_id, p_user_id)
  ON CONFLICT (poll_id, user_id) DO UPDATE
    SET option_id = EXCLUDED.option_id, voted_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aggregate counts + the caller's own vote only -- never an individual
-- ballot list. is_my_vote is computed from auth.uid(), so it's simply
-- always false for a caller with no session (there is no such caller in
-- practice: this RPC is only ever invoked by an authenticated web
-- request, per the GRANT below).
CREATE OR REPLACE FUNCTION get_poll_results(p_poll_id UUID)
RETURNS TABLE (option_id UUID, label TEXT, vote_count BIGINT, is_my_vote BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT
    po.id,
    po.label,
    COUNT(pv.id) AS vote_count,
    EXISTS (
      SELECT 1 FROM poll_votes my
      WHERE my.poll_id = p_poll_id AND my.option_id = po.id AND my.user_id = auth.uid()
    ) AS is_my_vote
  FROM poll_options po
  LEFT JOIN poll_votes pv ON pv.option_id = po.id
  WHERE po.poll_id = p_poll_id
  GROUP BY po.id, po.label, po."position"
  ORDER BY po."position";
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION create_poll_with_options FROM PUBLIC;
REVOKE ALL ON FUNCTION submit_poll_vote FROM PUBLIC;
REVOKE ALL ON FUNCTION submit_poll_vote_as FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION get_poll_results FROM PUBLIC;

GRANT EXECUTE ON FUNCTION create_poll_with_options TO authenticated;
GRANT EXECUTE ON FUNCTION submit_poll_vote TO authenticated;
GRANT EXECUTE ON FUNCTION submit_poll_vote_as TO service_role;
GRANT EXECUTE ON FUNCTION get_poll_results TO authenticated;

-- =====================================================================
-- ROLLBACK NOTES
--
-- REVOKE ALL ON FUNCTION create_poll_with_options FROM authenticated;
-- REVOKE ALL ON FUNCTION submit_poll_vote FROM authenticated;
-- REVOKE ALL ON FUNCTION submit_poll_vote_as FROM service_role;
-- REVOKE ALL ON FUNCTION get_poll_results FROM authenticated;
-- DROP FUNCTION IF EXISTS create_poll_with_options(TEXT, TEXT[], UUID);
-- DROP FUNCTION IF EXISTS submit_poll_vote(UUID, UUID);
-- DROP FUNCTION IF EXISTS submit_poll_vote_as(UUID, UUID, UUID);
-- DROP FUNCTION IF EXISTS get_poll_results(UUID);
-- DROP TABLE IF EXISTS poll_votes, poll_options, polls;
--
-- New tables/functions only -- no existing table or migration is
-- modified.
-- =====================================================================
