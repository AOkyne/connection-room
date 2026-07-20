-- Root cause of a reported Supabase health incident (memory pressure, swap,
-- I/O wait, oversized TOAST tables): profiles.profile_photo and
-- public_profiles.profile_photo have always stored the photo itself as a
-- base64 data URL directly in Postgres, duplicated across both tables by
-- sync_public_profile() (migration 039+). Confirmed live: 93 rows,
-- ~58MB of current logical data in each table, largest single row ~6.3MB
-- -- the profile-photos Storage bucket already exists (migration 048) but
-- app/onboarding/page.tsx (every new member's mandatory first photo) never
-- used it, only FileReader.readAsDataURL().
--
-- This migration only adds the new path-based columns -- it does NOT
-- touch, clear, or backfill profile_photo. Staged, reversible: existing
-- reads keep working unchanged until the application code and a separate
-- one-time backfill script (run manually, not part of this migration,
-- since it needs to decode/recompress/upload -- not something plain SQL
-- can do) populate profile_photo_path for existing rows.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_photo_path TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_updated_at TIMESTAMPTZ;

ALTER TABLE public_profiles
  ADD COLUMN IF NOT EXISTS profile_photo_path TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_updated_at TIMESTAMPTZ;

-- Extends the existing sync trigger (unchanged otherwise) to also mirror
-- the two new columns, same unconditional treatment as profile_photo
-- itself -- not a member-controlled show_* flag, just platform data.
CREATE OR REPLACE FUNCTION sync_public_profile() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE '
    INSERT INTO public_profiles
      (user_id, display_name, profile_photo, pronouns, location, interests,
       spaces_joined, is_seeded, age_range, orientation, relationship_status,
       why_joined, connection_intentions, quiz_result,
       connection_comfort_level, selected_reflection, completed_onboarding,
       deactivated_at, profile_photo_path, profile_photo_updated_at)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    ON CONFLICT ON CONSTRAINT public_profiles_pkey DO UPDATE SET
      display_name = EXCLUDED.display_name,
      profile_photo = EXCLUDED.profile_photo,
      pronouns = EXCLUDED.pronouns,
      location = EXCLUDED.location,
      interests = EXCLUDED.interests,
      spaces_joined = EXCLUDED.spaces_joined,
      is_seeded = EXCLUDED.is_seeded,
      age_range = EXCLUDED.age_range,
      orientation = EXCLUDED.orientation,
      relationship_status = EXCLUDED.relationship_status,
      why_joined = EXCLUDED.why_joined,
      connection_intentions = EXCLUDED.connection_intentions,
      quiz_result = EXCLUDED.quiz_result,
      connection_comfort_level = EXCLUDED.connection_comfort_level,
      selected_reflection = EXCLUDED.selected_reflection,
      completed_onboarding = EXCLUDED.completed_onboarding,
      deactivated_at = EXCLUDED.deactivated_at,
      profile_photo_path = EXCLUDED.profile_photo_path,
      profile_photo_updated_at = EXCLUDED.profile_photo_updated_at,
      updated_at = NOW()
  '
  USING
    NEW.user_id, NEW.display_name, NEW.profile_photo, NEW.pronouns,
    NEW.location, COALESCE(NEW.interests, '[]'::jsonb),
    COALESCE(NEW.spaces_joined, '[]'::jsonb), COALESCE(NEW.is_seeded, FALSE),
    NEW.age_range, NEW.orientation, NEW.relationship_status,
    NEW.what_brought_you_here, NEW.connection_hoping, NEW.quiz_result,
    NEW.connection_comfort_level, NEW.first_prompt_response,
    COALESCE(NEW.completed_onboarding, FALSE), NEW.deactivated_at,
    NEW.profile_photo_path, NEW.profile_photo_updated_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Must recreate in full (CREATE OR REPLACE VIEW doesn't allow adding
-- columns anywhere but the end -- inserting one before an existing
-- trailing column makes Postgres think you're renaming that column
-- instead of adding a new one; hit this exact error twice already in
-- migrations 059 and 062). profile_photo_path/profile_photo_updated_at
-- appended last.
CREATE OR REPLACE VIEW public_profiles_view AS
SELECT
  user_id,
  display_name,
  profile_photo,
  tagline,
  CASE WHEN show_pronouns THEN pronouns ELSE NULL END AS pronouns,
  CASE WHEN show_general_location THEN location ELSE NULL END AS location,
  CASE WHEN show_interests THEN interests ELSE '[]'::jsonb END AS interests,
  spaces_joined,
  show_in_discovery,
  show_recent_posts,
  profile_visibility,
  is_seeded,
  CASE WHEN show_age THEN age_range ELSE NULL END AS age_range,
  CASE WHEN show_orientation THEN orientation ELSE NULL END AS orientation,
  CASE WHEN show_relationship_status THEN relationship_status ELSE NULL END AS relationship_status,
  CASE WHEN show_why_joined THEN why_joined ELSE NULL END AS why_joined,
  CASE WHEN show_connection_intentions THEN connection_intentions ELSE NULL END AS connection_intentions,
  CASE WHEN show_quiz_result THEN quiz_result ELSE NULL END AS quiz_result,
  CASE WHEN show_connection_comfort_level THEN connection_comfort_level ELSE NULL END AS connection_comfort_level,
  CASE WHEN show_selected_reflection THEN selected_reflection ELSE NULL END AS selected_reflection,
  created_at AS member_since,
  completed_onboarding,
  deactivated_at,
  profile_photo_path,
  profile_photo_updated_at
FROM public_profiles;

ALTER VIEW public_profiles_view SET (security_invoker = true);

-- =====================================================================
-- ROLLBACK NOTES
--
-- Dropping profile_photo_path/profile_photo_updated_at (or reverting the
-- trigger/view to the pre-064 version) is safe on its own -- nothing has
-- been deleted from profile_photo, so every read falls back to the
-- original base64 behavior. Do not drop profile_photo itself as part of
-- any rollback; that IS destructive and is deliberately out of scope for
-- this migration (see objective 6: keep the old column until the new
-- path-based flow is verified in production).
-- =====================================================================
