-- 101: Multiple-choice polls ("choose all that apply").
--
-- polls.allow_multiple (default false, so every existing poll keeps
-- behaving exactly as before). A member can then hold one poll_votes row
-- per OPTION instead of one per poll:
--
-- - poll_votes' UNIQUE (poll_id, user_id) becomes
--   UNIQUE (poll_id, user_id, option_id). "One vote per member" for a
--   single-choice poll is now enforced by the RPCs below (they clear the
--   member's other rows first) instead of by the constraint.
-- - Every function that used ON CONFLICT (poll_id, user_id) is replaced
--   in this same migration, since that conflict target stops existing.
-- - submit_poll_votes(): new web-path RPC that sets a member's whole
--   selection at once (the checkbox list + Submit in the app).
-- - submit_poll_vote_as() (email path): for a multiple-choice poll each
--   link click ADDS that option (email can't show checkboxes, so the
--   recipient taps each option they want); single-choice still replaces.
-- - get_poll_results(): gains voter_count (distinct members who voted),
--   so a multiple-choice poll can show "% of voters" per option.
--
-- No new tables (so no new GRANTs needed -- see migration 100's note).
-- ROLLBACK NOTES are at the bottom of the file.

ALTER TABLE polls ADD COLUMN IF NOT EXISTS allow_multiple BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_poll_id_user_id_key;
ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_poll_id_user_id_option_id_key;
ALTER TABLE poll_votes ADD CONSTRAINT poll_votes_poll_id_user_id_option_id_key UNIQUE (poll_id, user_id, option_id);

-- create_poll_with_options gains p_allow_multiple. Dropped and recreated
-- rather than overloaded: two versions differing only by a defaulted
-- parameter would make a 3-argument call ambiguous.
DROP FUNCTION IF EXISTS create_poll_with_options(TEXT, TEXT[], UUID);

CREATE OR REPLACE FUNCTION create_poll_with_options(
  p_question TEXT,
  p_options TEXT[],
  p_post_id UUID DEFAULT NULL,
  p_allow_multiple BOOLEAN DEFAULT false
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

  INSERT INTO polls (post_id, question, created_by, allow_multiple)
  VALUES (p_post_id, p_question, auth.uid(), COALESCE(p_allow_multiple, false))
  RETURNING id INTO v_poll_id;

  FOREACH v_option IN ARRAY p_options LOOP
    INSERT INTO poll_options (poll_id, label, "position")
    VALUES (v_poll_id, v_option, v_position);
    v_position := v_position + 1;
  END LOOP;

  RETURN v_poll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Web path, single option (the one-tap buttons on a single-choice poll).
-- Replaces the member's vote on a single-choice poll; on a
-- multiple-choice poll it adds the option (the app uses
-- submit_poll_votes() for those, this just stays safe if called).
CREATE OR REPLACE FUNCTION submit_poll_vote(p_poll_id UUID, p_option_id UUID) RETURNS VOID AS $$
DECLARE
  v_allow_multiple BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM poll_options WHERE id = p_option_id AND poll_id = p_poll_id) THEN
    RAISE EXCEPTION 'This option does not belong to this poll';
  END IF;

  SELECT allow_multiple INTO v_allow_multiple FROM polls WHERE id = p_poll_id;

  IF NOT v_allow_multiple THEN
    DELETE FROM poll_votes
    WHERE poll_id = p_poll_id AND user_id = auth.uid() AND option_id <> p_option_id;
  END IF;

  INSERT INTO poll_votes (poll_id, option_id, user_id)
  VALUES (p_poll_id, p_option_id, auth.uid())
  ON CONFLICT (poll_id, user_id, option_id) DO UPDATE SET voted_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Web path, whole selection at once (checkbox list + Submit). Replaces
-- everything the member had chosen on this poll with p_option_ids.
CREATE OR REPLACE FUNCTION submit_poll_votes(p_poll_id UUID, p_option_ids UUID[]) RETURNS VOID AS $$
DECLARE
  v_allow_multiple BOOLEAN;
  v_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT allow_multiple INTO v_allow_multiple FROM polls WHERE id = p_poll_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found';
  END IF;

  v_count := COALESCE(array_length(p_option_ids, 1), 0);
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Choose at least one option';
  END IF;
  IF NOT v_allow_multiple AND v_count > 1 THEN
    RAISE EXCEPTION 'This poll only allows one answer';
  END IF;

  IF (SELECT COUNT(*) FROM poll_options WHERE poll_id = p_poll_id AND id = ANY (p_option_ids))
     <> (SELECT COUNT(DISTINCT x) FROM unnest(p_option_ids) AS x) THEN
    RAISE EXCEPTION 'An option does not belong to this poll';
  END IF;

  DELETE FROM poll_votes
  WHERE poll_id = p_poll_id AND user_id = auth.uid() AND NOT (option_id = ANY (p_option_ids));

  INSERT INTO poll_votes (poll_id, option_id, user_id)
  SELECT DISTINCT p_poll_id, x, auth.uid() FROM unnest(p_option_ids) AS x
  ON CONFLICT (poll_id, user_id, option_id) DO UPDATE SET voted_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Email path (service_role only -- see migration 099). Single-choice:
-- replaces. Multiple-choice: each click adds that option.
CREATE OR REPLACE FUNCTION submit_poll_vote_as(p_user_id UUID, p_poll_id UUID, p_option_id UUID) RETURNS VOID AS $$
DECLARE
  v_allow_multiple BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM poll_options WHERE id = p_option_id AND poll_id = p_poll_id) THEN
    RAISE EXCEPTION 'This option does not belong to this poll';
  END IF;

  SELECT allow_multiple INTO v_allow_multiple FROM polls WHERE id = p_poll_id;

  IF NOT v_allow_multiple THEN
    DELETE FROM poll_votes
    WHERE poll_id = p_poll_id AND user_id = p_user_id AND option_id <> p_option_id;
  END IF;

  INSERT INTO poll_votes (poll_id, option_id, user_id)
  VALUES (p_poll_id, p_option_id, p_user_id)
  ON CONFLICT (poll_id, user_id, option_id) DO UPDATE SET voted_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Return shape changes (new voter_count column), which CREATE OR REPLACE
-- can't do -- drop first.
DROP FUNCTION IF EXISTS get_poll_results(UUID);

CREATE OR REPLACE FUNCTION get_poll_results(p_poll_id UUID)
RETURNS TABLE (option_id UUID, label TEXT, vote_count BIGINT, is_my_vote BOOLEAN, voter_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    po.id,
    po.label,
    COUNT(pv.id) AS vote_count,
    EXISTS (
      SELECT 1 FROM poll_votes my
      WHERE my.poll_id = p_poll_id AND my.option_id = po.id AND my.user_id = auth.uid()
    ) AS is_my_vote,
    (SELECT COUNT(DISTINCT v.user_id) FROM poll_votes v WHERE v.poll_id = p_poll_id) AS voter_count
  FROM poll_options po
  LEFT JOIN poll_votes pv ON pv.option_id = po.id
  WHERE po.poll_id = p_poll_id
  GROUP BY po.id, po.label, po."position"
  ORDER BY po."position";
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION create_poll_with_options(TEXT, TEXT[], UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION submit_poll_vote(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION submit_poll_votes(UUID, UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION submit_poll_vote_as(UUID, UUID, UUID) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION get_poll_results(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION create_poll_with_options(TEXT, TEXT[], UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_poll_vote(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_poll_votes(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_poll_vote_as(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_poll_results(UUID) TO authenticated;

-- =====================================================================
-- ROLLBACK NOTES
--
-- Only safe while no member holds more than one vote on a poll (i.e.
-- before any multiple-choice poll has been answered); otherwise delete
-- the extra rows first.
--
-- DROP FUNCTION IF EXISTS submit_poll_votes(UUID, UUID[]);
-- ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_poll_id_user_id_option_id_key;
-- ALTER TABLE poll_votes ADD CONSTRAINT poll_votes_poll_id_user_id_key UNIQUE (poll_id, user_id);
-- Then re-run the create_poll_with_options / submit_poll_vote /
-- submit_poll_vote_as / get_poll_results definitions and GRANTs from
-- migration 099 (dropping create_poll_with_options(TEXT, TEXT[], UUID,
-- BOOLEAN) and get_poll_results(UUID) first), and finally:
-- ALTER TABLE polls DROP COLUMN IF EXISTS allow_multiple;
-- =====================================================================
