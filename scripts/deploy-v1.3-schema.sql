-- ============================================================
-- v1.3 Schema Deployment Script
-- Copy and paste this entire script into Supabase SQL Editor
-- Then click "Run" to apply all changes
-- ============================================================

-- Drop existing tables if they exist (be careful in production!)
-- DROP TABLE IF EXISTS user_reflections CASCADE;
-- DROP TABLE IF EXISTS daily_companion_content CASCADE;
-- DROP TABLE IF EXISTS weekly_notes CASCADE;

-- ============================================================
-- Daily companion content table
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_companion_content (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('theme', 'reflection', 'practice', 'checkin', 'invitation', 'quote')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  intended_date DATE,
  rotation_index INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Weekly Trevor Notes table
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 16),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  related_prompt_id TEXT REFERENCES daily_companion_content(id) ON DELETE SET NULL,
  related_space_id TEXT REFERENCES spaces(id) ON DELETE SET NULL,
  intended_date DATE,
  rotation_index INTEGER NOT NULL CHECK (rotation_index >= 0 AND rotation_index < 16),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- User reflections table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_reflections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES daily_companion_content(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  response TEXT NOT NULL,
  privacy_setting TEXT NOT NULL DEFAULT 'private' CHECK (privacy_setting IN ('private', 'shared')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Enable Row Level Security
-- ============================================================
ALTER TABLE daily_companion_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reflections ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies for daily_companion_content
-- ============================================================
-- Anyone can read active daily content
DROP POLICY IF EXISTS "Anyone can view active daily content" ON daily_companion_content;
CREATE POLICY "Anyone can view active daily content"
  ON daily_companion_content FOR SELECT
  USING (active = TRUE);

-- Service role only can insert/update daily content
DROP POLICY IF EXISTS "Service role can manage daily content" ON daily_companion_content;
CREATE POLICY "Service role can manage daily content"
  ON daily_companion_content FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Service role can update daily content" ON daily_companion_content;
CREATE POLICY "Service role can update daily content"
  ON daily_companion_content FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- RLS Policies for weekly_notes
-- ============================================================
-- Anyone can read active notes
DROP POLICY IF EXISTS "Anyone can view active weekly notes" ON weekly_notes;
CREATE POLICY "Anyone can view active weekly notes"
  ON weekly_notes FOR SELECT
  USING (active = TRUE);

-- Service role can manage notes
DROP POLICY IF EXISTS "Service role can manage weekly notes" ON weekly_notes;
CREATE POLICY "Service role can manage weekly notes"
  ON weekly_notes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Service role can update weekly notes" ON weekly_notes;
CREATE POLICY "Service role can update weekly notes"
  ON weekly_notes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- RLS Policies for user_reflections
-- ============================================================
-- Users can only view their own reflections
DROP POLICY IF EXISTS "Users can view own reflections" ON user_reflections;
CREATE POLICY "Users can view own reflections"
  ON user_reflections FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own reflections
DROP POLICY IF EXISTS "Users can create reflections" ON user_reflections;
CREATE POLICY "Users can create reflections"
  ON user_reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reflections
DROP POLICY IF EXISTS "Users can update own reflections" ON user_reflections;
CREATE POLICY "Users can update own reflections"
  ON user_reflections FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reflections
DROP POLICY IF EXISTS "Users can delete own reflections" ON user_reflections;
CREATE POLICY "Users can delete own reflections"
  ON user_reflections FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Create indexes for performance
-- ============================================================
DROP INDEX IF EXISTS idx_daily_content_type_date;
CREATE INDEX idx_daily_content_type_date ON daily_companion_content(content_type, intended_date);

DROP INDEX IF EXISTS idx_daily_content_rotation;
CREATE INDEX idx_daily_content_rotation ON daily_companion_content(rotation_index, active);

DROP INDEX IF EXISTS idx_daily_content_active;
CREATE INDEX idx_daily_content_active ON daily_companion_content(active);

DROP INDEX IF EXISTS idx_weekly_notes_rotation;
CREATE INDEX idx_weekly_notes_rotation ON weekly_notes(rotation_index, active);

DROP INDEX IF EXISTS idx_weekly_notes_active;
CREATE INDEX idx_weekly_notes_active ON weekly_notes(active);

DROP INDEX IF EXISTS idx_user_reflections_user;
CREATE INDEX idx_user_reflections_user ON user_reflections(user_id);

DROP INDEX IF EXISTS idx_user_reflections_content;
CREATE INDEX idx_user_reflections_content ON user_reflections(content_id);

DROP INDEX IF EXISTS idx_user_reflections_created;
CREATE INDEX idx_user_reflections_created ON user_reflections(user_id, created_at DESC);

-- ============================================================
-- Done! Schema is ready.
-- Next: Run the seeding script to populate initial content.
-- ============================================================
