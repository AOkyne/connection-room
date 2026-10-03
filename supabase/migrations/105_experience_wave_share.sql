-- 105: One shared question per wave, and cap each "Your Experience Wanted" wave at a share of the
-- membership (default 25%). Members beyond the cap simply wait for a
-- later wave, in the same fair order (never invited first, then longest
-- since last invited).
--
-- Also: single_question_per_wave (default true) -- every member invited in
-- a wave gets the same question, so each wave builds one shared
-- conversation. Members who can't receive that question wait for a later
-- wave. Off = spread across questions with per_question_cap each.
--
-- ROLLBACK:
-- ALTER TABLE experience_settings DROP COLUMN IF EXISTS single_question_per_wave;
-- ALTER TABLE experience_settings DROP COLUMN IF EXISTS max_wave_share_percent;

ALTER TABLE experience_settings
  ADD COLUMN IF NOT EXISTS max_wave_share_percent INT NOT NULL DEFAULT 25
  CHECK (max_wave_share_percent BETWEEN 1 AND 100);

ALTER TABLE experience_settings
  ADD COLUMN IF NOT EXISTS single_question_per_wave BOOLEAN NOT NULL DEFAULT true;
