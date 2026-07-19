-- Members can now deactivate their own account (self-service, reversible --
-- hides them from other members' space lists and the discovery pool;
-- signing back in reactivates automatically) in addition to the existing
-- admin-only "Suspend Member" (profiles.suspended, migration 058), which is
-- a separate, admin-initiated action with no member-facing equivalent.
-- NULL means active; a timestamp records when the member deactivated.
--
-- Mirrored into public_profiles the same way completed_onboarding was
-- (migration 059) -- unconditionally, not a member-controlled show_* flag,
-- since this is a platform state, not something a member "shares".
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

ALTER TABLE public_profiles
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

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
       deactivated_at)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
      updated_at = NOW()
  '
  USING
    NEW.user_id, NEW.display_name, NEW.profile_photo, NEW.pronouns,
    NEW.location, COALESCE(NEW.interests, '[]'::jsonb),
    COALESCE(NEW.spaces_joined, '[]'::jsonb), COALESCE(NEW.is_seeded, FALSE),
    NEW.age_range, NEW.orientation, NEW.relationship_status,
    NEW.what_brought_you_here, NEW.connection_hoping, NEW.quiz_result,
    NEW.connection_comfort_level, NEW.first_prompt_response,
    COALESCE(NEW.completed_onboarding, FALSE), NEW.deactivated_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Must recreate in full (CREATE OR REPLACE VIEW doesn't allow adding
-- columns), and security_invoker must be re-asserted every time this view
-- is replaced (lost silently once already, migration 045). deactivated_at
-- is appended at the very end -- CREATE OR REPLACE VIEW only allows adding
-- new columns there; inserting one before an existing trailing column
-- makes Postgres think you're renaming that column instead of adding a new
-- one (hit exactly this in migration 059, first attempt failed with
-- "cannot change name of view column member_since to completed_onboarding").
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
  created_at AS member_since,
  deactivated_at
FROM public_profiles;

ALTER VIEW public_profiles_view SET (security_invoker = true);

-- One-time backfill: mirrors current profiles.deactivated_at (always NULL
-- for existing rows, since this column is new) into public_profiles. Kept
-- for consistency with the migration-059 pattern even though it's a no-op
-- today -- future rows are kept in sync going forward by the trigger above.
UPDATE public_profiles pp
SET deactivated_at = p.deactivated_at
FROM profiles p
WHERE pp.user_id = p.user_id;

-- =====================================================================
-- ROLLBACK NOTES
--
-- Reverting the view/trigger to the pre-062 version would drop
-- deactivated_at from cross-member reads again, silently re-allowing
-- deactivated members back into space member lists and the Community
-- Members grid -- do not do this without also reverting the
-- lib/data/profiles.ts query changes that filter on it.
-- =====================================================================
