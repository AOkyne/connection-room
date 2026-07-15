-- CRITICAL FIX for a second bug introduced by 039, found immediately
-- after 041 during live two-account verification testing.
--
-- sync_public_profile()'s INSERT used "ON CONFLICT (user_id) DO UPDATE
-- SET ...". Inside a PL/pgSQL trigger function on profiles, NEW is a
-- record variable whose fields include user_id -- the same bare name used
-- as the conflict target for the (different) public_profiles table. The
-- PL/pgSQL compiler cannot tell whether "user_id" in that position means
-- "NEW's user_id field" or "public_profiles' user_id column" and refuses
-- to guess:
--
--   42702: column reference "user_id" is ambiguous
--   (could refer to either a PL/pgSQL variable or a table column)
--
-- Effect: every write to profiles that went through the ordinary upsert
-- path (saveProfileToSupabase, i.e. every profile edit and the original
-- signup write) fired this trigger, which then errored -- the outer
-- upsert failed as a result, silently, because the app's save function
-- only console.errors on failure and the UI shows an optimistic "Profile
-- updated" toast regardless. Confirmed live: two freshly created test
-- profiles both had updated_at == created_at after "saving" real display
-- names and other fields through the UI -- nothing had actually persisted
-- since 039 went live. A direct upsert straight into public_profiles
-- (bypassing the trigger) succeeded with the identical shape, isolating
-- the bug to the trigger's own SQL rather than RLS or anything else.
--
-- Fix: target the conflict by the primary key's constraint name instead
-- of by column name. This never reads as a bare identifier that could be
-- confused with a NEW field, so the ambiguity can't arise.

CREATE OR REPLACE FUNCTION sync_public_profile() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public_profiles (
    user_id, display_name, profile_photo, pronouns, location, interests,
    spaces_joined, is_seeded
  )
  VALUES (
    NEW.user_id, NEW.display_name, NEW.profile_photo, NEW.pronouns,
    NEW.location, COALESCE(NEW.interests, '[]'::jsonb),
    COALESCE(NEW.spaces_joined, '[]'::jsonb), COALESCE(NEW.is_seeded, FALSE)
  )
  ON CONFLICT ON CONSTRAINT public_profiles_pkey DO UPDATE SET
    display_name = EXCLUDED.display_name,
    profile_photo = EXCLUDED.profile_photo,
    pronouns = EXCLUDED.pronouns,
    location = EXCLUDED.location,
    interests = EXCLUDED.interests,
    spaces_joined = EXCLUDED.spaces_joined,
    is_seeded = EXCLUDED.is_seeded,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-sync every existing profiles row now that the trigger works, so
-- anything saved during the broken window (between 039 going live and
-- this fix) is caught up immediately rather than waiting for each member
-- to happen to save their profile again. Same shape as 039's original
-- backfill; safe to run more than once.
INSERT INTO public_profiles (
  user_id, display_name, profile_photo, pronouns, location, interests,
  spaces_joined, is_seeded
)
SELECT
  user_id, display_name, profile_photo, pronouns, location,
  COALESCE(interests, '[]'::jsonb), COALESCE(spaces_joined, '[]'::jsonb),
  COALESCE(is_seeded, FALSE)
FROM profiles
WHERE user_id IS NOT NULL
ON CONFLICT ON CONSTRAINT public_profiles_pkey DO UPDATE SET
  display_name = EXCLUDED.display_name,
  profile_photo = EXCLUDED.profile_photo,
  pronouns = EXCLUDED.pronouns,
  location = EXCLUDED.location,
  interests = EXCLUDED.interests,
  spaces_joined = EXCLUDED.spaces_joined,
  is_seeded = EXCLUDED.is_seeded,
  updated_at = NOW();

-- =====================================================================
-- ROLLBACK NOTES
--
-- Rolling back means reverting to "ON CONFLICT (user_id)", which is the
-- exact bug this migration fixes -- do not roll this back. If
-- public_profiles' primary key is ever redefined under a different
-- constraint name, update the ON CONFLICT ON CONSTRAINT clause here to
-- match (check via \d public_profiles or information_schema.
-- table_constraints).
--
-- The backfill above already re-syncs every profiles row against the
-- fixed trigger logic as part of applying this migration, so anything
-- saved during the broken window is caught up immediately -- no separate
-- manual backfill step is needed.
-- =====================================================================
