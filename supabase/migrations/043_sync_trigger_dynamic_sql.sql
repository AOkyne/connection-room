-- 042 targeted the ON CONFLICT clause by constraint name, on the theory
-- that the bare "user_id" there was what PL/pgSQL was reading as
-- ambiguous against NEW.user_id. That did not fix it -- the identical
-- 42702 error still occurs. The remaining bare "user_id" in the function
-- is the INSERT's own target column list
-- ("INSERT INTO public_profiles (user_id, display_name, ...)"), which
-- means PL/pgSQL's identifier resolution is being applied even to a
-- column-list position, not just expression positions -- a more expansive
-- version of the same NEW-field-name collision than initially assumed.
--
-- Rather than continue guessing at exactly which bare identifier PL/pgSQL
-- is tripping over, this migration sidesteps the whole class of problem:
-- the insert/upsert is issued as a dynamic SQL string via EXECUTE ...
-- USING. Text passed to EXECUTE is not parsed against the function's own
-- variables the way inline SQL statements are -- it's compiled fresh at
-- runtime as ordinary SQL, so "user_id" in it can only ever mean the
-- target table's column.

CREATE OR REPLACE FUNCTION sync_public_profile() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE '
    INSERT INTO public_profiles
      (user_id, display_name, profile_photo, pronouns, location, interests, spaces_joined, is_seeded)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT ON CONSTRAINT public_profiles_pkey DO UPDATE SET
      display_name = EXCLUDED.display_name,
      profile_photo = EXCLUDED.profile_photo,
      pronouns = EXCLUDED.pronouns,
      location = EXCLUDED.location,
      interests = EXCLUDED.interests,
      spaces_joined = EXCLUDED.spaces_joined,
      is_seeded = EXCLUDED.is_seeded,
      updated_at = NOW()
  '
  USING
    NEW.user_id, NEW.display_name, NEW.profile_photo, NEW.pronouns,
    NEW.location, COALESCE(NEW.interests, '[]'::jsonb),
    COALESCE(NEW.spaces_joined, '[]'::jsonb), COALESCE(NEW.is_seeded, FALSE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-run the backfill again now that the trigger genuinely works, to
-- catch anything saved during the window between 041/042 (which did not
-- fix this) and this migration.
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
-- Rolling back means reverting to inline (non-dynamic) SQL in the
-- trigger, which is what produced the 42702 ambiguous-column error this
-- migration fixes -- do not roll this back.
-- =====================================================================
