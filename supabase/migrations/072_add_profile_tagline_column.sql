-- 072: Actually create profiles.profile_tagline.
--
-- Every prior "profile_tagline" investigation (this session and before)
-- diagnosed a PostgREST schema-cache staleness issue and tried to fix it
-- with NOTIFY pgrst, 'reload schema' (migrations 066, 071) or a full
-- project restart. None of that worked, for the simplest possible reason:
-- confirmed live via select("*") that the column does not exist in the
-- table at all right now (it's absent from the full row shape entirely,
-- not just unselectable by name). It was apparently added out-of-band to
-- the live DB at some point (no migration in this repo ever created it)
-- and is no longer there -- dropped, or the out-of-band change never
-- actually landed. No amount of cache-reloading can fix a column that
-- genuinely isn't there.
--
-- Nullable, no default -- this is an optional, freeform one-line profile
-- tagline (see app/onboarding/page.tsx's "Profile tagline (optional)"
-- field); most rows will never set it.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_tagline TEXT;

-- Now genuinely useful (the column actually exists for PostgREST to find).
NOTIFY pgrst, 'reload schema';
