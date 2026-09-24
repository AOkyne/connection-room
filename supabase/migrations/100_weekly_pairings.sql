-- 100: Weekly pairings -- opt-in, lightly matched, one new pair per week,
-- each pair gets a normal 'direct' conversation (migration 096) with an
-- icebreaker prompt from a new admin-editable prompt list.
--
-- DESIGN:
--
-- 1. Opt-in is a NEW boolean defaulting to false, not the existing
--    connection_preferences.frequency column -- frequency defaults to
--    'weekly' for every existing row (migration 010), so reusing it would
--    silently opt every current member in. Pairing someone who never
--    asked for it would run directly against the opt-in decision.
--
-- 2. A pairing is just an ordinary 'direct' connection -- no rounds, no
--    timer, nothing new to learn. The icebreaker lives on the existing
--    connections.shared_prompt column (migration 010) and is shown as a
--    banner in the conversation, rather than inserted as a fake message:
--    connection_messages.from_user_id must be a real participant, and a
--    message "from" neither person would render as if the partner wrote it.
--
-- 3. weekly_pairings has one row per member per week (UNIQUE week_start,
--    user_id), which makes the weekly job idempotent -- re-running it the
--    same week can never pair anyone twice -- and doubles as the history
--    used to avoid repeat pairs and repeat prompts.
--
-- 4. Explicit GRANTs on every new table, per Supabase's Oct 30 2026
--    change (new public tables no longer get Data API access by default).
--
-- ROLLBACK NOTES are at the bottom of the file.

-- =====================================================================
-- 1. Opt-in
-- =====================================================================

ALTER TABLE connection_preferences
  ADD COLUMN IF NOT EXISTS weekly_pairing_opt_in BOOLEAN NOT NULL DEFAULT false;

-- =====================================================================
-- 2. Prompt list (admin-editable; read by the weekly job via service role)
-- =====================================================================

CREATE TABLE IF NOT EXISTS pairing_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('thoughtful', 'funny', 'controversial', 'playful', 'deep')),
  prompt_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pairing_prompts ENABLE ROW LEVEL SECURITY;

-- No member-facing policies: the weekly job and the admin page both go
-- through service-role API routes (requireAdmin() for the admin page).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pairing_prompts TO service_role;

-- =====================================================================
-- 3. Pairing history
-- =====================================================================

CREATE TABLE IF NOT EXISTS weekly_pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES connections(id) ON DELETE SET NULL,
  prompt_id UUID REFERENCES pairing_prompts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (week_start, user_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_pairings_user ON weekly_pairings(user_id);

ALTER TABLE weekly_pairings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their own pairings" ON weekly_pairings;
CREATE POLICY "Members can view their own pairings"
  ON weekly_pairings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.weekly_pairings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_pairings TO service_role;

-- =====================================================================
-- 4. Starter prompts -- a mix of thoughtful, funny, controversial,
--    playful, and deep. Controversial means genuinely debatable, not
--    inflammatory. Edit, add, or switch any off from the admin page.
-- =====================================================================

INSERT INTO pairing_prompts (category, prompt_text) VALUES
  -- thoughtful
  ('thoughtful', 'What''s something you''ve changed your mind about in the last few years?'),
  ('thoughtful', 'Who taught you the most about being a man -- and was it mostly by example, or by what not to do?'),
  ('thoughtful', 'What does a really good friendship look like to you?'),
  ('thoughtful', 'What''s a small thing someone did for you once that you still remember?'),
  ('thoughtful', 'When do you feel most like yourself?'),
  ('thoughtful', 'What''s something you''re quietly proud of that most people don''t know about?'),
  ('thoughtful', 'What''s a question you wish people asked you more often?'),
  ('thoughtful', 'What does "enough" look like for you -- in work, money, or life?'),
  -- funny
  ('funny', 'What''s the most ridiculous thing you''ve ever done to impress someone?'),
  ('funny', 'What''s a hill you will die on that absolutely does not matter?'),
  ('funny', 'What''s the worst haircut, outfit, or phase you''ve ever had? Photos optional but encouraged.'),
  ('funny', 'If your life had a laugh track, what moment this week would have gotten the biggest laugh?'),
  ('funny', 'What''s a skill you''re weirdly good at that has never once been useful?'),
  ('funny', 'What''s the most "dad" thing you do, whether or not you''re a dad?'),
  ('funny', 'What''s your most irrational fear?'),
  ('funny', 'What would your autobiography be called?'),
  -- controversial (debatable, respectful)
  ('controversial', 'Is monogamy natural, or is it a choice we keep making?'),
  ('controversial', 'Can men and women really be "just friends"?'),
  ('controversial', 'Is it ever okay to read your partner''s phone?'),
  ('controversial', 'Should you tell a friend if you know their partner is cheating?'),
  ('controversial', 'Is there such a thing as too much honesty in a relationship?'),
  ('controversial', 'Do men have fewer close friends because of culture, or because of choice?'),
  ('controversial', 'Is vulnerability always a strength, or are there times it''s wiser to hold back?'),
  ('controversial', 'Does therapy make people more self-aware, or just more self-absorbed?'),
  ('controversial', 'Is jealousy a sign of love, or a sign of insecurity?'),
  ('controversial', 'Is it harder to be a man today than it was for your father''s generation?'),
  -- playful
  ('playful', 'Would you rather know how you''ll die, or when?'),
  ('playful', 'If you could master any skill overnight, what would you pick?'),
  ('playful', 'What''s your go-to karaoke song -- or the one you''d never be caught singing?'),
  ('playful', 'If you could have dinner with any three people, living or dead, who''s at the table?'),
  ('playful', 'Describe your perfect lazy Sunday.'),
  ('playful', 'What''s one thing on your bucket list you''ll probably never actually do?'),
  -- deep
  ('deep', 'What''s something you''ve never said out loud but think about often?'),
  ('deep', 'When was the last time you cried, and what brought it on?'),
  ('deep', 'What do you need more of right now that you haven''t asked anyone for?'),
  ('deep', 'What''s a part of yourself you''re still learning to accept?'),
  ('deep', 'What would you want someone to understand about you before they really got to know you?'),
  ('deep', 'What''s a relationship -- of any kind -- that shaped you more than you expected?');

-- =====================================================================
-- ROLLBACK NOTES
--
-- DROP TABLE IF EXISTS weekly_pairings;
-- DROP TABLE IF EXISTS pairing_prompts;
-- ALTER TABLE connection_preferences DROP COLUMN IF EXISTS weekly_pairing_opt_in;
--
-- New tables and one new defaulted column only -- no existing rows are
-- rewritten and no prior migration is modified. Pairing connections
-- themselves are ordinary 'direct' rows in `connections` and are left in
-- place by this rollback.
-- =====================================================================
