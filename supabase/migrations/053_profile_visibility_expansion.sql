-- Profile visibility expansion.
--
-- PROBLEM: migration 039 locked profiles down (correctly -- it was fixing a
-- real leak), but public_profiles only ever carried display_name,
-- profile_photo, tagline, pronouns, location, interests, spaces_joined.
-- That's too little for real connection: age, orientation, relationship
-- status, why someone joined, their quiz result, etc. all became
-- permanently invisible to other members, with no opt-in path back. Product
-- direction (approved, see PRIVACY_SECURITY_MODEL.md): bring a curated set
-- of these fields back as member-controlled, individually-toggleable
-- visibility, not a return to "everything is public."
--
-- PRINCIPLE: identity can be visible, vulnerability should be chosen, safety
-- information stays private. Nothing in section 4 of the product spec this
-- implements (email, phone, exact address, birth date, connection
-- boundaries, moderation/safety data, message contents, etc.) is touched by
-- this migration -- none of it was ever copied into public_profiles, and
-- none of it is added here either.
--
-- WHAT THIS DOES NOT CHANGE: no RLS policy on either table. RLS is
-- row-level, not column-level -- public_profiles' existing policies
-- (owner/admin/members_only/shared_spaces/hidden) already correctly gate who
-- can read a row at all; adding masked columns to an already-protected
-- table needs no new policy. shared_spaces visibility was already fully
-- implemented at the RLS level in migration 039, just never exercised by
-- any UI control -- still true after this migration.

-- =====================================================================
-- 1. New columns on public_profiles.
--
-- Each new "story" column is paired with its own show_* flag, same pattern
-- as the existing show_pronouns/show_general_location/show_interests. All
-- new show_* flags default per the product's recommended defaults:
-- identity/story fields (age, orientation, relationship status, why
-- joined, connection intentions) default visible; deeper/vulnerable fields
-- (quiz result, connection comfort level, selected reflection) default
-- hidden.
-- =====================================================================

ALTER TABLE public_profiles
  ADD COLUMN IF NOT EXISTS age_range TEXT,
  ADD COLUMN IF NOT EXISTS orientation TEXT,
  ADD COLUMN IF NOT EXISTS relationship_status TEXT,
  ADD COLUMN IF NOT EXISTS why_joined TEXT,
  ADD COLUMN IF NOT EXISTS connection_intentions TEXT,
  ADD COLUMN IF NOT EXISTS quiz_result TEXT,
  ADD COLUMN IF NOT EXISTS connection_comfort_level TEXT,
  ADD COLUMN IF NOT EXISTS selected_reflection TEXT,

  ADD COLUMN IF NOT EXISTS show_age BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_orientation BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_relationship_status BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_why_joined BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_connection_intentions BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_quiz_result BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_connection_comfort_level BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_selected_reflection BOOLEAN NOT NULL DEFAULT FALSE;

-- =====================================================================
-- 2. Backfill.
--
-- (a) show_general_location: was FALSE by default in migration 039, but no
-- member has ever actually had a chance to opt out of it (no UI control has
-- ever existed for this flag). Flipping the default and backfilling
-- existing rows to TRUE is safe -- it reflects the product's new intended
-- default, not a reversal of anyone's real choice.
--
-- (b) The 8 new story columns above: backfilled from profiles in the same
-- pass sync_public_profile() will maintain going forward (step 3).
--
-- (c) show_selected_reflection: unlike the other new flags, this one is NOT
-- backfilled to a flat default. profiles.first_prompt_is_public has existed
-- since before this migration as the member's own choice about whether
-- their first prompt response is shareable, even though nothing ever
-- surfaced it. Defaulting every existing member to FALSE regardless would
-- silently reverse a choice some members already made. Backfill from that
-- column instead; only rows created after this migration get the new flat
-- FALSE default.
-- =====================================================================

ALTER TABLE public_profiles ALTER COLUMN show_general_location SET DEFAULT TRUE;
UPDATE public_profiles SET show_general_location = TRUE;

UPDATE public_profiles pp SET
  age_range = p.age_range,
  orientation = p.orientation,
  relationship_status = p.relationship_status,
  why_joined = p.what_brought_you_here,
  connection_intentions = p.connection_hoping,
  quiz_result = p.quiz_result,
  connection_comfort_level = p.connection_comfort_level,
  selected_reflection = p.first_prompt_response,
  show_selected_reflection = COALESCE(p.first_prompt_is_public, FALSE)
FROM profiles p
WHERE p.user_id = pp.user_id;

-- =====================================================================
-- 3. Extend the sync trigger.
--
-- Same EXECUTE ... USING dynamic-SQL pattern as migration 043 -- inline SQL
-- in this trigger caused a 42702 ambiguous-column bug that took two
-- attempts (042, then 043) to actually fix. Do not revert to inline SQL
-- here. Still never touches any show_* column on UPDATE, so a profile edit
-- never resets a member's own sharing preferences -- those are only ever
-- defaulted once, on first INSERT, via the table's column defaults (which
-- this trigger's INSERT omits).
-- =====================================================================

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
       connection_comfort_level, selected_reflection)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
      updated_at = NOW()
  '
  USING
    NEW.user_id, NEW.display_name, NEW.profile_photo, NEW.pronouns,
    NEW.location, COALESCE(NEW.interests, '[]'::jsonb),
    COALESCE(NEW.spaces_joined, '[]'::jsonb), COALESCE(NEW.is_seeded, FALSE),
    NEW.age_range, NEW.orientation, NEW.relationship_status,
    NEW.what_brought_you_here, NEW.connection_hoping, NEW.quiz_result,
    NEW.connection_comfort_level, NEW.first_prompt_response;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger itself is unchanged (still AFTER INSERT OR UPDATE ON profiles),
-- only the function body above changed -- no need to drop/recreate it.

-- =====================================================================
-- 4. Column-masking view. Must be recreated in full (CREATE OR REPLACE
-- VIEW doesn't let you add columns to an existing view's SELECT list
-- otherwise), and security_invoker must be re-asserted every time this view
-- is replaced -- it was silently lost once already (migration 045) and
-- defeated row-level visibility without erroring.
-- =====================================================================

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
  created_at AS member_since
FROM public_profiles;

ALTER VIEW public_profiles_view SET (security_invoker = true);

COMMENT ON VIEW public_profiles_view IS
  'Column-masked read layer over public_profiles. All member-facing cross-user reads should query this view, never public_profiles or profiles directly. Row visibility is enforced by public_profiles RLS; this view additionally nulls individual fields per the owner''s show_* flags.';

-- =====================================================================
-- KNOWN LIMITATIONS (documented, not silently dropped -- see
-- PRIVACY_SECURITY_MODEL.md for the full writeup):
--
-- - Badges, event attendance, and journey progress have no member-facing
--   cross-user display surface anywhere in the app today (confirmed: the
--   only code that reads these reads the caller's own data). No columns or
--   show_* flags are added for them -- there is nothing to gate yet, and
--   adding unused flags now would be dead schema. Add them when the
--   corresponding display feature is actually built.
-- - "Current exploration," "relationship goals" (as distinct from
--   relationship_status), and "open to one-to-one connections" have no
--   backing column anywhere in this schema and are not invented here.
-- - "Intimacy pattern" and "quiz result" are the same concept in this app
--   (quiz_result's actual values are archetypes like "Armored Achiever" --
--   see lib/config.ts) and share one column/flag, not two.
-- - "Spiritual interests" / "sexuality-related interests" are already
--   covered by the existing interests/show_interests column (the interest
--   tag list already includes "Spirituality" and "Sexuality") -- no new
--   columns needed.
-- =====================================================================

-- =====================================================================
-- ROLLBACK NOTES
--
-- To revert this migration:
--   CREATE OR REPLACE VIEW public_profiles_view AS
--     SELECT user_id, display_name, profile_photo, tagline,
--       CASE WHEN show_pronouns THEN pronouns ELSE NULL END AS pronouns,
--       CASE WHEN show_general_location THEN location ELSE NULL END AS location,
--       CASE WHEN show_interests THEN interests ELSE '[]'::jsonb END AS interests,
--       spaces_joined, show_in_discovery, show_recent_posts,
--       profile_visibility, is_seeded
--     FROM public_profiles;
--   ALTER VIEW public_profiles_view SET (security_invoker = true);
--   -- Restore sync_public_profile() to migration 043's version (see that
--   -- file) -- do not drop the function, just CREATE OR REPLACE it back.
--   ALTER TABLE public_profiles
--     DROP COLUMN IF EXISTS age_range,
--     DROP COLUMN IF EXISTS orientation,
--     DROP COLUMN IF EXISTS relationship_status,
--     DROP COLUMN IF EXISTS why_joined,
--     DROP COLUMN IF EXISTS connection_intentions,
--     DROP COLUMN IF EXISTS quiz_result,
--     DROP COLUMN IF EXISTS connection_comfort_level,
--     DROP COLUMN IF EXISTS selected_reflection,
--     DROP COLUMN IF EXISTS show_age,
--     DROP COLUMN IF EXISTS show_orientation,
--     DROP COLUMN IF EXISTS show_relationship_status,
--     DROP COLUMN IF EXISTS show_why_joined,
--     DROP COLUMN IF EXISTS show_connection_intentions,
--     DROP COLUMN IF EXISTS show_quiz_result,
--     DROP COLUMN IF EXISTS show_connection_comfort_level,
--     DROP COLUMN IF EXISTS show_selected_reflection;
--   -- show_general_location's default/backfill is not reverted -- there is
--   -- no prior member choice to restore (see step 2a above), so reverting
--   -- it would just be re-hiding location for members who were never given
--   -- the chance to choose either way.
--
-- This migration does not touch any RLS policy and does not modify
-- migrations 001-052.
-- =====================================================================
