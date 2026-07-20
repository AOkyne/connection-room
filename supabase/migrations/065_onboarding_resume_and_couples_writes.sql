-- Fixes three onboarding-completion bugs found while investigating why
-- ~15 real members had filled out their entire profile (name, photo,
-- interests, connection preference, even the final reflection prompt) but
-- were still stuck with completed_onboarding = false:
--
-- 1. Onboarding has no persisted step. app/onboarding/page.tsx's
--    currentStep only ever lived in React state, never written anywhere.
--    Combined with app/app/layout.tsx's redirect (any member with
--    completed_onboarding = false is bounced to /onboarding on every
--    visit), a member who got 8/9 steps in and closed the tab before
--    clicking "Enter the Community" landed back on the "Welcome" screen
--    every single time they returned -- with no sign they'd already done
--    the work. onboarding_step lets the page resume where they left off.
--
-- 2. The photo step's confirmation checkbox (photo_confirmed/
--    photo_confirmed_at) was already read/written by the onboarding page
--    and typed on the Profile interface, but had no backing column --
--    saveProfileToSupabase() silently dropped it from every write. So the
--    checkbox reset on every reload, forcing a re-confirm before Continue
--    would enable, even when the photo itself was already saved.
--
-- 3. The "couples" step's two inputs (couple name, couple goals) have no
--    onChange handlers at all right now -- nothing typed there is saved.
--    couples_profiles (001_beta_schema.sql) already exists for exactly
--    this data but has no INSERT/UPDATE policy and no unique constraint
--    to upsert against (confirmed live: 0 rows, no application code
--    references this table at all yet, so both are safe to add).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT,
  ADD COLUMN IF NOT EXISTS photo_confirmed BOOLEAN,
  ADD COLUMN IF NOT EXISTS photo_confirmed_at TIMESTAMPTZ;

-- Lets the couples-step save path upsert onConflict: partner_1_user_id
-- instead of hand-rolling a select-then-insert-or-update race. Safe to add
-- now (table confirmed empty) -- would need a dedupe pass first if this
-- table ever accumulates real rows before a fix like this ships.
ALTER TABLE couples_profiles
  ADD CONSTRAINT couples_profiles_partner_1_user_id_key UNIQUE (partner_1_user_id);

-- Owner-only write access, mirroring 001_beta_schema.sql's existing
-- "Partners can read their couples profile" SELECT policy (USING
-- partner_1_user_id = auth.uid() OR partner_2_user_id = auth.uid()).
-- Partner 2 has no write policy here deliberately -- partner accounts are
-- "coming in Phase 2" per the onboarding UI's own copy, so only the
-- member who started the couple profile can create/edit it for now.
CREATE POLICY "Partner 1 can insert their couples profile"
  ON couples_profiles FOR INSERT
  WITH CHECK (partner_1_user_id = auth.uid());

CREATE POLICY "Partner 1 can update their couples profile"
  ON couples_profiles FOR UPDATE
  USING (partner_1_user_id = auth.uid());

-- =====================================================================
-- ROLLBACK NOTES
--
-- Dropping onboarding_step/photo_confirmed/photo_confirmed_at is safe on
-- its own -- onboarding_step only ever affects which step the wizard opens
-- on (worst case, back to always restarting at "welcome"), and
-- photo_confirmed reverting to unpersisted just restores the pre-065
-- re-confirm-every-time behavior. Neither is read by any other feature.
--
-- Dropping the two couples_profiles policies and the unique constraint is
-- also safe as long as couples_profiles is still empty or has no
-- duplicate partner_1_user_id rows at rollback time; check row count
-- first if this has been live a while.
-- =====================================================================
