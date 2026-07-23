-- 067: Server-side backstop for onboarding completion integrity.
--
-- Every gate that requires a name and photo before entering the community
-- has so far lived client-side, and a series of client races/resume bugs
-- (see app/onboarding/page.tsx history) each found a new way around them:
-- 8 real members completed onboarding with no photo stored at all, and 4
-- with placeholder/initial-only last names. This trigger makes the rule
-- structural: a profile row cannot TRANSITION into
-- completed_onboarding = true without a plausible first and last name and
-- a stored photo, no matter which code path (or future bug) attempts it.
--
-- Deliberately scoped narrow:
--  - Only fires on the transition into completed (INSERT with true, or
--    UPDATE from not-true to true). Rows already completed -- including
--    legacy members with junk names or no photo -- can still be edited
--    freely; nothing here can lock an existing member out of saving their
--    profile.
--  - Seeded/demo rows (is_seeded = true) are exempt so seeding tooling
--    keeps working.
--  - Requires photo presence (storage path or legacy value), not
--    photo_confirmed -- confirmation is a UX-level requirement enforced
--    client-side; the structural invariant is "no photo-less members."

CREATE OR REPLACE FUNCTION enforce_onboarding_completion_requirements()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_onboarding IS TRUE
     AND (TG_OP = 'INSERT' OR OLD.completed_onboarding IS DISTINCT FROM TRUE)
     AND COALESCE(NEW.is_seeded, false) = false THEN

    IF length(trim(COALESCE(NEW.first_name, ''))) < 2
       OR trim(COALESCE(NEW.first_name, '')) !~ '[A-Za-z]'
       OR length(trim(COALESCE(NEW.last_name, ''))) < 2
       OR trim(COALESCE(NEW.last_name, '')) !~ '[A-Za-z]' THEN
      RAISE EXCEPTION 'Onboarding cannot be completed without a proper first and last name.'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.profile_photo_path IS NULL
       AND NULLIF(trim(COALESCE(NEW.profile_photo, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Onboarding cannot be completed without a profile photo.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_onboarding_completion ON profiles;
CREATE TRIGGER trg_enforce_onboarding_completion
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_onboarding_completion_requirements();

-- Refresh PostgREST's schema cache (see migration 066's comment).
NOTIFY pgrst, 'reload schema';
