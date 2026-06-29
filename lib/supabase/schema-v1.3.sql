-- ============================================================
-- v1.3 Schema Additions: Daily Companion Content
-- ============================================================

-- Daily companion content table
-- Stores all daily content: themes, reflections, practices, check-ins, invitations, quotes
CREATE TABLE IF NOT EXISTS daily_companion_content (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  content_type TEXT NOT NULL, -- 'theme', 'reflection', 'practice', 'checkin', 'invitation', 'quote'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT, -- optional categorization
  intended_date DATE, -- exact date, if known
  rotation_index INTEGER, -- fallback: days since app launch
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Weekly Trevor Notes
-- One note per week, rotates every 7 days
CREATE TABLE IF NOT EXISTS weekly_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL, -- ~120-200 words
  related_prompt_id TEXT REFERENCES daily_companion_content(id) ON DELETE SET NULL,
  related_space_id TEXT REFERENCES spaces(id) ON DELETE SET NULL,
  intended_date DATE,
  rotation_index INTEGER, -- fallback: weeks since app launch
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User reflections
-- Private reflections saved from daily prompts
CREATE TABLE IF NOT EXISTS user_reflections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES daily_companion_content(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL, -- snapshot of prompt at time of reflection
  response TEXT NOT NULL,
  privacy_setting TEXT DEFAULT 'private', -- 'private', 'shared' (future)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Quiz results (if not already present)
-- Store user quiz completion for "Continue Where You Left Off"
CREATE TABLE IF NOT EXISTS user_quiz_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id TEXT NOT NULL,
  quiz_title TEXT NOT NULL,
  result_title TEXT NOT NULL,
  result_body TEXT,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security on new tables
ALTER TABLE daily_companion_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Daily Companion Content
-- Anyone can read active daily content
CREATE POLICY "Anyone can view active daily content"
  ON daily_companion_content FOR SELECT
  USING (active = TRUE);

-- Only admins can create/update daily content (for now, restrict to bypass auth check)
-- In production, implement proper admin role check
CREATE POLICY "Service role can manage daily content"
  ON daily_companion_content FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update daily content"
  ON daily_companion_content FOR UPDATE
  USING (true);

-- RLS Policies: Weekly Notes
-- Anyone can read active notes
CREATE POLICY "Anyone can view active weekly notes"
  ON weekly_notes FOR SELECT
  USING (active = TRUE);

-- Service role can manage notes
CREATE POLICY "Service role can manage weekly notes"
  ON weekly_notes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update weekly notes"
  ON weekly_notes FOR UPDATE
  USING (true);

-- RLS Policies: User Reflections
-- Users can only view their own reflections
CREATE POLICY "Users can view own reflections"
  ON user_reflections FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own reflections
CREATE POLICY "Users can create reflections"
  ON user_reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reflections
CREATE POLICY "Users can update own reflections"
  ON user_reflections FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reflections
CREATE POLICY "Users can delete own reflections"
  ON user_reflections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies: Quiz Results
-- Users can view their own quiz results
CREATE POLICY "Users can view own quiz results"
  ON user_quiz_results FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create quiz results
CREATE POLICY "Users can create quiz results"
  ON user_quiz_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_daily_content_type_date ON daily_companion_content(content_type, intended_date);
CREATE INDEX idx_daily_content_rotation ON daily_companion_content(rotation_index);
CREATE INDEX idx_weekly_notes_rotation ON weekly_notes(rotation_index);
CREATE INDEX idx_user_reflections_user ON user_reflections(user_id);
CREATE INDEX idx_user_reflections_content ON user_reflections(content_id);
CREATE INDEX idx_user_quiz_results_user ON user_quiz_results(user_id);
