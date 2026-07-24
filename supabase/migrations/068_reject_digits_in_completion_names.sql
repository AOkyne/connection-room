-- 068: Reject digits in first/last name on onboarding completion.
--
-- Migration 067's name check only verified "contains a letter" -- it does
-- not (and structurally cannot) verify a name is a real first/last name
-- rather than a screen name. Confirmed live: a member's first_name was
-- literally their username ("beachballs2006") and passed every existing
-- check, including this trigger, since it does contain letters.
--
-- A digit is a cheap, strong signal: real first/last names essentially
-- never contain one, while usernames/handles very often do. This doesn't
-- make the check semantically complete (a determined user can still type
-- a plausible-looking fake name), but it closes this specific, observed
-- hole. Mirrors the same rule added client-side in
-- app/onboarding/page.tsx's isRealName().

CREATE OR REPLACE FUNCTION enforce_onboarding_completion_requirements()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_onboarding IS TRUE
     AND (TG_OP = 'INSERT' OR OLD.completed_onboarding IS DISTINCT FROM TRUE)
     AND COALESCE(NEW.is_seeded, false) = false THEN

    IF length(trim(COALESCE(NEW.first_name, ''))) < 2
       OR trim(COALESCE(NEW.first_name, '')) !~ '[A-Za-z]'
       OR trim(COALESCE(NEW.first_name, '')) ~ '[0-9]'
       OR length(trim(COALESCE(NEW.last_name, ''))) < 2
       OR trim(COALESCE(NEW.last_name, '')) !~ '[A-Za-z]'
       OR trim(COALESCE(NEW.last_name, '')) ~ '[0-9]' THEN
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

-- Trigger itself is unchanged (still points at the same function name);
-- CREATE OR REPLACE FUNCTION above is sufficient, no need to re-create it.

-- Refresh PostgREST's schema cache (see migration 066's comment).
NOTIFY pgrst, 'reload schema';
