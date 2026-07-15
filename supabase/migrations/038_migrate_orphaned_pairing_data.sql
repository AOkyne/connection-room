-- Migration 027 was written to rename pairing_comfort_level/pairing_boundaries
-- to connection_comfort_level/connection_boundaries, but was never actually
-- executed against production (confirmed: both the old and new column names
-- currently coexist on profiles, which could only happen if the rename never
-- ran -- migration 036 separately created connection_comfort_level/
-- connection_boundaries as new, empty columns).
--
-- Real members who used the app before the rename was written have answers
-- sitting in the old pairing_* columns that the current app code has never
-- been able to see, since it only reads connection_comfort_level/
-- connection_boundaries. This copies that data across for real (non-seeded)
-- profiles only. Seeded demo profiles (user_id IS NULL) intentionally
-- untouched. Only fills connection_* where it's currently empty, so this is
-- safe to run more than once and won't clobber anything already set there.

UPDATE profiles
SET connection_comfort_level = pairing_comfort_level
WHERE user_id IS NOT NULL
  AND pairing_comfort_level IS NOT NULL
  AND connection_comfort_level IS NULL;

UPDATE profiles
SET connection_boundaries = pairing_boundaries
WHERE user_id IS NOT NULL
  AND pairing_boundaries IS NOT NULL
  AND connection_boundaries IS NULL;
