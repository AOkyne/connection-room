-- One-time backfill for real members who completed onboarding before
-- migration 036 fixed the schema bug that silently blocked
-- onboarding_completed_at from ever being set (see that migration's comment
-- for the full story). Sets it to NOW() rather than their real join date, so
-- they start the day5/14/30 drip sequence fresh from today instead of having
-- all three fire at once for being "weeks overdue."
--
-- Scoped to exact profile ids, not a broader completed_onboarding=true sweep,
-- so it can never accidentally catch a seeded demo profile (those have
-- user_id IS NULL and are already skipped by the cron regardless, but being
-- explicit here avoids any ambiguity about who this touches).
--
-- Seth A. and Michael already had completed_onboarding = true (just missing
-- the timestamp). Trevor J.'s profile had completed_onboarding = false too
-- (never finished onboarding, or hit this same bug), so his update also sets
-- that flag -- otherwise he'd get drip emails while still flagged as an
-- incomplete member, which would be an inconsistent state elsewhere in the app.

UPDATE profiles
SET onboarding_completed_at = NOW()
WHERE id IN (
  '01926824-3d67-425d-afe1-aa8102208117', -- Seth A.
  '634ecc45-d6f9-433c-a7d8-0ccd037a4c6e'   -- Michael
)
AND onboarding_completed_at IS NULL;

UPDATE profiles
SET completed_onboarding = TRUE,
    onboarding_completed_at = NOW()
WHERE id = '76c06b22-e646-4713-a7da-2e168b714d5b' -- Trevor J.
AND onboarding_completed_at IS NULL;
