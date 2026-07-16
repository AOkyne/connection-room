-- profiles.spaces_joined (a JSONB array, also mirrored onto
-- public_profiles.spaces_joined via 039's sync trigger) has never actually
-- been kept in sync with space_memberships, the real source of truth for
-- who's in a space -- confirmed live: Trevor has 8 rows in
-- space_memberships but an empty spaces_joined array. This wasn't just
-- one broken query -- .spacesJoined is read in 12+ places across the app
-- (space member list pages, the "shared spaces" section on member profile
-- pages, admin's getProfilesBySpace, badge-eligibility logic in
-- lib/data/badges.ts), and every one of them has been silently getting
-- empty/wrong results since profiles.spaces_joined was never populated in
-- the first place. Rather than patch each call site to query
-- space_memberships directly (the approach already taken for
-- getPublicProfilesBySpace, getMemberCountBySpace, getSpaceStats), this
-- fixes it at the source: keep profiles.spaces_joined automatically
-- derived from space_memberships, so every existing consumer starts
-- getting real data without being individually rewritten.

CREATE OR REPLACE FUNCTION sync_spaces_joined() RETURNS TRIGGER AS $$
DECLARE
  affected_user_id uuid;
BEGIN
  affected_user_id := COALESCE(NEW.user_id, OLD.user_id);

  UPDATE profiles
  SET spaces_joined = (
    SELECT COALESCE(jsonb_agg(space_id), '[]'::jsonb)
    FROM space_memberships
    WHERE user_id = affected_user_id
  )
  WHERE profiles.user_id = affected_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS space_memberships_sync_profiles ON space_memberships;
CREATE TRIGGER space_memberships_sync_profiles
  AFTER INSERT OR DELETE ON space_memberships
  FOR EACH ROW EXECUTE FUNCTION sync_spaces_joined();

-- One-time backfill: recompute spaces_joined for every profile with at
-- least one real space_memberships row, from that real data. Updating
-- profiles also fires 039's existing sync_public_profile trigger, which
-- propagates the corrected value onto public_profiles.spaces_joined too.
UPDATE profiles
SET spaces_joined = (
  SELECT COALESCE(jsonb_agg(sm.space_id), '[]'::jsonb)
  FROM space_memberships sm
  WHERE sm.user_id = profiles.user_id
)
WHERE profiles.user_id IN (SELECT DISTINCT user_id FROM space_memberships);

-- =====================================================================
-- ROLLBACK NOTES
--
-- Dropping the trigger (DROP TRIGGER IF EXISTS
-- space_memberships_sync_profiles ON space_memberships;) stops future
-- joins/leaves from updating spaces_joined, reintroducing the staleness
-- this migration fixes -- do not do this without a specific reason. The
-- backfill UPDATE is a one-time data correction; there is nothing to roll
-- back for it (the corrected values are the correct ones).
-- =====================================================================
