-- Migration 027 tried to RENAME pairing_comfort_level/pairing_boundaries to
-- connection_comfort_level/connection_boundaries, but those pairing_* columns
-- never actually existed on profiles (only in the separate legacy
-- pairing_preferences table) -- so the RENAME silently failed and neither the
-- old nor new column name has ever existed on profiles.
--
-- App code (lib/data/profiles.ts, saveProfileToSupabase) has referenced
-- connection_comfort_level/connection_boundaries unconditionally the whole
-- time, so every profile upsert that goes through that path has been failing
-- with PGRST204 "column not found" -- including onboarding completion, which
-- is why onboarding_completed_at has never been set for any real member and
-- the 5/14/30-day drip email sequence has never actually fired.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS connection_comfort_level TEXT,
  ADD COLUMN IF NOT EXISTS connection_boundaries TEXT;
