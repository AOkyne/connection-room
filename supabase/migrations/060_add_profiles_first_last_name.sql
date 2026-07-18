-- Found while investigating "admin should see full names, not just display
-- name": profiles has never had first_name/last_name columns at all --
-- only display_name, which onboarding deliberately truncates to "First L."
-- (first name + last-initial-and-period) for member-facing display. The
-- onboarding form collects a real first AND last name and validates both
-- are non-empty, but saveProfileToSupabase() (lib/data/supabase-profiles.ts)
-- only ever wrote display_name -- the full last name was discarded at save
-- time and has never been recoverable from the database. (That function's
-- own read-back mapping already expected profileData.first_name/last_name
-- to exist -- they just never did, so those lines were silently falling
-- back to the in-memory value the whole time.)
--
-- This also means a member's OWN profile-edit page would show "V." as
-- their last name if they ever returned to edit it, not their real last
-- name "Vaccaro" -- not just an admin-visibility gap.
--
-- Not mirrored into public_profiles -- these are for the owner's own
-- editing and admin visibility only; other members should keep seeing
-- only display_name, same as today.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- One-time backfill for existing rows, best-effort: splits display_name
-- the same way the application code already did everywhere it needed
-- firstName/lastName (first word / remainder). For most real members this
-- recovers first_name correctly but last_name only as whatever was already
-- truncated into display_name (e.g. "V." from "Michael V.") -- the real
-- full last name for existing members was never stored anywhere and is
-- not recoverable by this migration. Going forward, new saves write the
-- real values via the application code change alongside this migration.
UPDATE profiles
SET
  first_name = COALESCE(first_name, split_part(display_name, ' ', 1)),
  last_name = COALESCE(last_name, NULLIF(trim(substring(display_name FROM position(' ' IN display_name) + 1)), ''))
WHERE display_name IS NOT NULL;

-- =====================================================================
-- ROLLBACK NOTES
--
-- Dropping these columns loses first/last name for any member who saved
-- their profile after this migration shipped (real full names that exist
-- nowhere else) -- do not do this without exporting the data first.
-- =====================================================================
