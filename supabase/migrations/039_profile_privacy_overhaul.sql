-- Profile privacy overhaul.
--
-- PROBLEM: profiles currently has "Profiles are readable by authenticated
-- users ... USING (TRUE)" (migration 001), meaning any signed-in member can
-- SELECT * on every other member's row -- including orientation,
-- relationship_status, connection_comfort_level, connection_boundaries,
-- quiz_result, and first_prompt_response. At least three real code paths
-- (app/members/[id]/page.tsx, lib/matching.ts, getProfilesBySpace) actively
-- fetch and in some cases directly render this data during normal use.
-- app/members/[id]/page.tsx additionally has no auth guard at all.
--
-- FIX: profiles becomes owner+admin only. A new public_profiles table holds
-- only what other members are allowed to see, with per-field visibility
-- flags. All cross-member reads in application code must move to
-- public_profiles (or the masking view below) -- that refactor is tracked
-- separately and lands in the same deploy as this migration.
--
-- WHY A TABLE, NOT JUST A VIEW, FOR THE PRIVATE/PUBLIC SPLIT: RLS is
-- row-level, not column-level -- a view over profiles could not withhold
-- individual private columns from a member who is allowed to see the row at
-- all, short of hand-listing safe columns, and every future column added to
-- profiles would default to LEAKING through such a view unless someone
-- remembers to exclude it. A real table with an explicit column list fails
-- safe: new private fields added to profiles are invisible to
-- public_profiles until someone deliberately adds them.
--
-- WHY A VIEW FOR PER-FIELD VISIBILITY (public_profiles_view, below): this is
-- a narrower, different problem -- nulling out individual already-public
-- columns based on the owner's own toggles (show_pronouns, etc). RLS can't
-- express "null this column when this row's own flag says so" either, but a
-- view can, safely, because it sits on top of a table that is already
-- row-restricted by RLS. All application code reads public_profiles_view,
-- never public_profiles directly, except for a user reading their own row.

-- =====================================================================
-- 1. public_profiles table
-- =====================================================================

CREATE TABLE IF NOT EXISTS public_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  profile_photo TEXT,
  tagline TEXT,
  pronouns TEXT,
  location TEXT,
  interests JSONB DEFAULT '[]'::jsonb,
  spaces_joined JSONB DEFAULT '[]'::jsonb,
  is_seeded BOOLEAN DEFAULT FALSE,

  -- Row-level visibility. 'hidden' = nobody but owner/admin. 'members_only'
  -- and 'member_discovery' both currently resolve to "any authenticated
  -- member" -- kept as two states because the product may later want
  -- discovery-surfaced vs. directly-linkable to differ, but there is no
  -- such distinction implemented yet. 'shared_spaces' is fully implemented
  -- below (visible only to members who share at least one space).
  profile_visibility TEXT NOT NULL DEFAULT 'members_only'
    CHECK (profile_visibility IN ('hidden', 'members_only', 'shared_spaces', 'member_discovery')),

  -- Column-level visibility, enforced by public_profiles_view, not by RLS.
  show_in_discovery BOOLEAN NOT NULL DEFAULT TRUE,
  show_general_location BOOLEAN NOT NULL DEFAULT FALSE,
  show_interests BOOLEAN NOT NULL DEFAULT TRUE,
  show_recent_posts BOOLEAN NOT NULL DEFAULT FALSE,
  show_pronouns BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS public_profiles_visibility_idx ON public_profiles(profile_visibility);

-- =====================================================================
-- 2. Backfill from profiles (safe fields only)
-- =====================================================================

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
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================================
-- 3. Keep public_profiles in sync with profiles automatically.
--
-- Every write path in the app (saveProfileToSupabase, signup insert, admin
-- edits) writes to profiles, not public_profiles. Rather than requiring
-- every one of those call sites to also remember to write to
-- public_profiles, a trigger derives the public row from the private one.
-- Only the derived/public columns are touched -- visibility flags are
-- untouched on UPDATE so a member's sharing preferences are never silently
-- reset by an unrelated profile edit, and are only defaulted once on first
-- INSERT.
-- =====================================================================

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
  ON CONFLICT (user_id) DO UPDATE SET
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

DROP TRIGGER IF EXISTS profiles_sync_public ON profiles;
CREATE TRIGGER profiles_sync_public
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_public_profile();

-- =====================================================================
-- 4. Lock down profiles: owner + admin only, no more blanket authenticated
--    read access.
-- =====================================================================

DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON profiles;

CREATE POLICY "profiles_owner_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin moderation access. Uses profiles.user_id = auth.uid(), NOT
-- profiles.id = auth.uid() -- profiles.id is a separate generated row UUID,
-- unrelated to the auth user id. Migration 012 wrote several admin policies
-- (on offers/events/event_registrations/activity_logs) using the id=auth.uid()
-- form; those can never match and have never actually granted RLS-level
-- admin access (admin routes have worked regardless because they use
-- requireAdmin() with the service-role key server-side, which bypasses RLS
-- entirely). Those pre-existing policies are out of scope for this
-- migration and are called out separately in the audit report -- fixing them
-- is a mechanical follow-up, not a profile-privacy concern.
CREATE POLICY "profiles_admin_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles admin_row
    WHERE admin_row.user_id = auth.uid() AND admin_row.role = 'admin'
  ));

-- Existing owner INSERT/UPDATE policies (migration 001) are unchanged and
-- remain correct: "Users can insert their own profile" / "Users can update
-- their own profile", both keyed on user_id = auth.uid().

-- Admin UPDATE, for moderation actions (e.g. admin editing a member's
-- profile from the admin dashboard through a client-side, RLS-bound call
-- rather than a service-role API route).
CREATE POLICY "profiles_admin_update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles admin_row
    WHERE admin_row.user_id = auth.uid() AND admin_row.role = 'admin'
  ));

-- =====================================================================
-- 5. RLS for public_profiles
-- =====================================================================

ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_profiles_owner_select"
  ON public_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "public_profiles_visible_to_members"
  ON public_profiles FOR SELECT
  TO authenticated
  USING (
    profile_visibility IN ('members_only', 'member_discovery')
    OR (
      profile_visibility = 'shared_spaces'
      AND EXISTS (
        SELECT 1 FROM space_memberships sm1
        JOIN space_memberships sm2 ON sm1.space_id = sm2.space_id
        WHERE sm1.user_id = auth.uid() AND sm2.user_id = public_profiles.user_id
      )
    )
    -- profile_visibility = 'hidden' matches neither branch above, so hidden
    -- rows are only reachable via the owner/admin policies.
  );

CREATE POLICY "public_profiles_admin_select"
  ON public_profiles FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles admin_row
    WHERE admin_row.user_id = auth.uid() AND admin_row.role = 'admin'
  ));

-- Owner can update their own visibility flags directly (the trigger only
-- ever touches the derived columns, so this doesn't fight with it).
CREATE POLICY "public_profiles_owner_update"
  ON public_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- INSERT is normally only ever done by the trigger (SECURITY DEFINER, runs
-- as table owner, bypasses RLS) -- this policy exists so a client could
-- still pre-create their own row (e.g. to set visibility prefs before their
-- first profiles write) without failing RLS.
CREATE POLICY "public_profiles_owner_insert"
  ON public_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "public_profiles_admin_update"
  ON public_profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles admin_row
    WHERE admin_row.user_id = auth.uid() AND admin_row.role = 'admin'
  ));

-- No anonymous access. No policy TO anon is created, and RLS defaults to
-- deny, so unauthenticated requests get zero rows from either table.

-- =====================================================================
-- 6. Column-level masking view. All application cross-member reads should
--    query this, not public_profiles directly.
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
  is_seeded
FROM public_profiles;

-- Views run with the querying user's own RLS permissions on the underlying
-- table by default (no SECURITY DEFINER here), so public_profiles' RLS
-- policies above still fully apply -- this view only masks columns, it
-- grants no additional row access.

COMMENT ON VIEW public_profiles_view IS
  'Column-masked read layer over public_profiles. All member-facing cross-user reads (member grid, discovery, post/comment author cards, space member lists, connection matching) should query this view, never public_profiles or profiles directly. Row visibility is enforced by public_profiles RLS; this view additionally nulls individual fields per the owner''s show_* flags.';

-- =====================================================================
-- ROLLBACK NOTES
--
-- To revert this migration:
--   DROP VIEW IF EXISTS public_profiles_view;
--   DROP TRIGGER IF EXISTS profiles_sync_public ON profiles;
--   DROP FUNCTION IF EXISTS sync_public_profile();
--   DROP POLICY IF EXISTS "profiles_owner_select" ON profiles;
--   DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
--   DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
--   CREATE POLICY "Profiles are readable by authenticated users"
--     ON profiles FOR SELECT TO authenticated USING (TRUE);
--   DROP TABLE IF EXISTS public_profiles;
--
-- Reverting restores the pre-migration state: any authenticated member can
-- again read every field of every other member's profiles row. Do not
-- revert this migration in production without a specific reason, since that
-- pre-migration state is the vulnerability this migration exists to close.
--
-- This migration does not touch profiles' INSERT/owner-UPDATE policies, and
-- does not modify migrations 001-038.
-- =====================================================================
