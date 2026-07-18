-- Members who haven't completed onboarding should not appear in space
-- member lists, the dashboard's Community Members grid, or the discovery
-- pool used for Connection matching. Connection matching
-- (app/api/matching/find) already filters profiles.completed_onboarding
-- directly (it runs server-side with the service-role key), but
-- getPublicProfilesBySpace()/getDiscoverableMembers() (lib/data/profiles.ts)
-- -- which power the space member list and the dashboard's Community
-- Members grid -- read public_profiles_view, which has never carried
-- completed_onboarding at all, so there was nothing for those two
-- functions to filter on.
--
-- Not privacy-sensitive information a member "shares" or hides via a
-- show_* flag -- it's a platform completeness gate, mirrored unconditionally
-- like display_name/spaces_joined already are.

ALTER TABLE public_profiles
  ADD COLUMN IF NOT EXISTS completed_onboarding BOOLEAN DEFAULT FALSE;

-- One-time backfill for existing rows (the trigger below only fires on
-- future profiles INSERT/UPDATE).
UPDATE public_profiles pp
SET completed_onboarding = p.completed_onboarding
FROM profiles p
WHERE pp.user_id = p.user_id;

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
       connection_comfort_level, selected_reflection, completed_onboarding)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
      updated_at = NOW()
  '
  USING
    NEW.user_id, NEW.display_name, NEW.profile_photo, NEW.pronouns,
    NEW.location, COALESCE(NEW.interests, '[]'::jsonb),
    COALESCE(NEW.spaces_joined, '[]'::jsonb), COALESCE(NEW.is_seeded, FALSE),
    NEW.age_range, NEW.orientation, NEW.relationship_status,
    NEW.what_brought_you_here, NEW.connection_hoping, NEW.quiz_result,
    NEW.connection_comfort_level, NEW.first_prompt_response,
    COALESCE(NEW.completed_onboarding, FALSE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Must recreate in full (CREATE OR REPLACE VIEW doesn't allow adding
-- columns), and security_invoker must be re-asserted every time this view
-- is replaced -- it was silently lost once already (migration 045) and
-- defeated row-level visibility without erroring.
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
  completed_onboarding,
  created_at AS member_since
FROM public_profiles;

ALTER VIEW public_profiles_view SET (security_invoker = true);

-- =====================================================================
-- ROLLBACK NOTES
--
-- Reverting the view/trigger to migration 053's version would drop
-- completed_onboarding from cross-member reads again, silently
-- re-allowing incomplete-onboarding members back into space member lists
-- and the Community Members grid -- do not do this without also
-- reverting the lib/data/profiles.ts query changes that filter on it.
-- =====================================================================
