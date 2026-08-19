-- Fixes migration 067/068's enforce_onboarding_completion_requirements()
-- trigger: its "already-completed rows can be edited freely" exemption
-- (OLD.completed_onboarding IS DISTINCT FROM TRUE) never actually
-- worked for the app's real save path.
--
-- Root cause, confirmed live by reproducing the exact failure (service
-- role, same upsert payload lib/data/supabase-profiles.ts sends):
-- saveProfileToSupabase() always writes via
-- `.upsert(payload, { onConflict: "user_id" })`, which compiles to
-- `INSERT ... ON CONFLICT (user_id) DO UPDATE`. Postgres evaluates the
-- row-level BEFORE trigger for the INSERT path of that statement before
-- conflict resolution -- at that point OLD is not the existing row, so
-- `TG_OP = 'INSERT' OR OLD.completed_onboarding IS DISTINCT FROM TRUE`
-- is satisfied unconditionally whenever NEW.completed_onboarding is
-- true, regardless of whether the row already existed and was already
-- completed. The exemption's intent ("nothing here can lock an existing
-- member out of saving their profile," per 067's own comment) was
-- correct; the OLD-based mechanism just doesn't see what it needs to at
-- the point Postgres actually invokes it for an upsert.
--
-- Confirmed affected live: a real member with completed_onboarding =
-- true and last_name IS NULL (a pre-067 legacy row, exactly the
-- "4 members with placeholder/initial-only last names" 067's own
-- comment says should remain freely editable) had every single profile
-- save fail with "Onboarding cannot be completed without a proper first
-- and last name" -- regardless of what field was actually being
-- changed, since the trigger fires on every upsert to the row.
--
-- Fix: check the row's actual persisted completion state directly
-- (a SELECT against the table, visible from a BEFORE trigger since the
-- current statement's own effect hasn't been written yet) instead of
-- relying on OLD/TG_OP. This is correct in every case: a genuine new
-- signup finds no existing row (NULL -> not exempt, validates
-- normally); a genuine first-time completion finds an existing but
-- not-yet-completed row (false -> not exempt, validates normally); an
-- edit to an already-completed row -- via upsert OR a plain UPDATE --
-- finds completed_onboarding = true (exempt, no re-validation), which
-- is the one case the previous version could not reliably detect.

CREATE OR REPLACE FUNCTION enforce_onboarding_completion_requirements()
RETURNS TRIGGER AS $$
DECLARE
  was_already_completed boolean;
BEGIN
  IF NEW.completed_onboarding IS TRUE
     AND COALESCE(NEW.is_seeded, false) = false THEN

    SELECT completed_onboarding INTO was_already_completed
    FROM profiles
    WHERE user_id = NEW.user_id;

    IF COALESCE(was_already_completed, false) IS NOT TRUE THEN
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition itself is unchanged (still points at the same
-- function name); CREATE OR REPLACE FUNCTION above is sufficient.

-- Refresh PostgREST's schema cache (see migration 066's comment).
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- ROLLBACK NOTES
--
-- Restores migration 068's version of the function (the OLD-based
-- exemption) -- see that migration for the exact CREATE OR REPLACE
-- FUNCTION body. Not recommended: that version is what caused this bug.
-- =====================================================================
