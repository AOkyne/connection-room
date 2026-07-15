-- Migration 024: Create Daily Companion Content Tables (v1.3.1)
--
-- Establishes proper database structure for daily companion content.
-- Previously, these tables were referenced in RLS policies but never created.
-- This migration creates the authoritative source for daily content.
--
-- New Tables:
-- 1. daily_companion_days - One entry per day, linking to individual content pieces
-- 2. daily_companion_content - Reusable content atoms (themes, reflections, practices, etc.)
-- 3. weekly_companion_notes - Weekly summaries and guidance
-- 4. user_reflections - Member reflection responses (was missing RLS)

-- ============================================================================
-- PART 1: Create daily_companion_content table
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_companion_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('theme', 'reflection', 'practice', 'body_checkin', 'conversation', 'quote', 'image')),
  title TEXT NOT NULL,
  body TEXT,
  category TEXT,
  rotation_index INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_content_type ON daily_companion_content(content_type);
CREATE INDEX IF NOT EXISTS idx_daily_content_rotation ON daily_companion_content(rotation_index);
CREATE INDEX IF NOT EXISTS idx_daily_content_active ON daily_companion_content(active);

-- ============================================================================
-- PART 2: Create daily_companion_days table
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_companion_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_date DATE NOT NULL,
  rotation_index INTEGER NOT NULL,
  theme_id UUID REFERENCES daily_companion_content(id) ON DELETE SET NULL,
  reflection_id UUID REFERENCES daily_companion_content(id) ON DELETE SET NULL,
  practice_id UUID REFERENCES daily_companion_content(id) ON DELETE SET NULL,
  body_checkin_id UUID REFERENCES daily_companion_content(id) ON DELETE SET NULL,
  conversation_invitation_id UUID REFERENCES daily_companion_content(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES daily_companion_content(id) ON DELETE SET NULL,
  hero_image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(rotation_date),
  UNIQUE(rotation_index)
);

CREATE INDEX IF NOT EXISTS idx_daily_days_date ON daily_companion_days(rotation_date);
CREATE INDEX IF NOT EXISTS idx_daily_days_rotation ON daily_companion_days(rotation_index);
CREATE INDEX IF NOT EXISTS idx_daily_days_active ON daily_companion_days(active);

-- ============================================================================
-- PART 3: Create weekly_companion_notes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS weekly_companion_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  rotation_index INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(week_number)
);

CREATE INDEX IF NOT EXISTS idx_weekly_notes_week ON weekly_companion_notes(week_number);
CREATE INDEX IF NOT EXISTS idx_weekly_notes_rotation ON weekly_companion_notes(rotation_index);
CREATE INDEX IF NOT EXISTS idx_weekly_notes_active ON weekly_companion_notes(active);

-- ============================================================================
-- PART 4: Create or update user_reflections table
-- ============================================================================

-- Only create if it doesn't exist
CREATE TABLE IF NOT EXISTS user_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_day_id UUID REFERENCES daily_companion_days(id) ON DELETE SET NULL,
  prompt_text TEXT,
  response TEXT,
  privacy_setting TEXT NOT NULL DEFAULT 'private' CHECK (privacy_setting IN ('private', 'shared')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reflections_user ON user_reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_daily_day ON user_reflections(daily_day_id);
CREATE INDEX IF NOT EXISTS idx_reflections_privacy ON user_reflections(privacy_setting);
CREATE INDEX IF NOT EXISTS idx_reflections_created ON user_reflections(created_at DESC);

-- ============================================================================
-- PART 5: Enable RLS on all tables
-- ============================================================================

ALTER TABLE daily_companion_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_companion_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_companion_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reflections ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 6: Create RLS policies for daily companion content (public read)
-- ============================================================================

-- Anyone (including anonymous) can read active daily companion content
DROP POLICY IF EXISTS "daily_companion_content_public_read" ON daily_companion_content;
CREATE POLICY "daily_companion_content_public_read"
  ON daily_companion_content
  FOR SELECT
  USING (active = true);

-- Admin can manage content
DROP POLICY IF EXISTS "daily_companion_content_admin" ON daily_companion_content;
CREATE POLICY "daily_companion_content_admin"
  ON daily_companion_content
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- PART 7: Create RLS policies for daily companion days (public read)
-- ============================================================================

-- Anyone (including anonymous) can read active daily companion days
DROP POLICY IF EXISTS "daily_companion_days_public_read" ON daily_companion_days;
CREATE POLICY "daily_companion_days_public_read"
  ON daily_companion_days
  FOR SELECT
  USING (active = true);

-- Admin can manage days
DROP POLICY IF EXISTS "daily_companion_days_admin" ON daily_companion_days;
CREATE POLICY "daily_companion_days_admin"
  ON daily_companion_days
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- PART 8: Create RLS policies for weekly notes (public read)
-- ============================================================================

-- Anyone (including anonymous) can read active weekly notes
DROP POLICY IF EXISTS "weekly_companion_notes_public_read" ON weekly_companion_notes;
CREATE POLICY "weekly_companion_notes_public_read"
  ON weekly_companion_notes
  FOR SELECT
  USING (active = true);

-- Admin can manage notes
DROP POLICY IF EXISTS "weekly_companion_notes_admin" ON weekly_companion_notes;
CREATE POLICY "weekly_companion_notes_admin"
  ON weekly_companion_notes
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- PART 9: Create RLS policies for user_reflections
-- ============================================================================

-- Owner can read own reflections
DROP POLICY IF EXISTS "user_reflections_owner_read" ON user_reflections;
CREATE POLICY "user_reflections_owner_read"
  ON user_reflections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Owner can create reflections
DROP POLICY IF EXISTS "user_reflections_owner_create" ON user_reflections;
CREATE POLICY "user_reflections_owner_create"
  ON user_reflections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owner can update own reflections
DROP POLICY IF EXISTS "user_reflections_owner_update" ON user_reflections;
CREATE POLICY "user_reflections_owner_update"
  ON user_reflections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owner can delete own reflections
DROP POLICY IF EXISTS "user_reflections_owner_delete" ON user_reflections;
CREATE POLICY "user_reflections_owner_delete"
  ON user_reflections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Shared reflections visible to space members
-- (To be fully implemented once space membership is confirmed in query)
DROP POLICY IF EXISTS "user_reflections_shared_read" ON user_reflections;
CREATE POLICY "user_reflections_shared_read"
  ON user_reflections
  FOR SELECT
  USING (
    privacy_setting = 'shared' AND
    EXISTS (
      SELECT 1 FROM space_memberships sm1
      WHERE sm1.user_id = auth.uid()
      AND sm1.space_id IN (
        SELECT DISTINCT space_id FROM space_memberships sm2
        WHERE sm2.user_id = user_reflections.user_id
      )
    )
  );

-- Admin can read all reflections (for moderation)
DROP POLICY IF EXISTS "user_reflections_admin_read" ON user_reflections;
CREATE POLICY "user_reflections_admin_read"
  ON user_reflections
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- Summary of Changes
-- ============================================================================
--
-- NEW TABLES (v1.3.1):
-- 1. daily_companion_content - Reusable content pieces (themes, reflections, practices, etc.)
--    - 120 entries seeded in migration 025
--    - Public read, admin write
--
-- 2. daily_companion_days - One entry per day, linking content
--    - 120 entries seeded in migration 025
--    - Public read, admin write
--    - Replaces fragile array-based rotation in client code
--
-- 3. weekly_companion_notes - Weekly summaries
--    - 16 entries seeded in migration 025
--    - Public read, admin write
--
-- 4. user_reflections - Member reflections (was missing table)
--    - Owner-only read/write
--    - Shared reflections visible to space members
--    - Admin can read all
--    - Full RLS enforcement (critical fix from migration 022)
--
-- BENEFITS:
-- - Removes client-side seeding (unsafe, creates duplicates)
-- - Establishes single source of truth for daily content
-- - Enables timezone-aware rotation logic
-- - Proper RLS enforcement for sensitive reflection data
-- - Allows future admin editing of daily content
--
-- MIGRATION NOTES:
-- - If tables already exist (from old Supabase setup), this creates no duplicates
--    due to IF NOT EXISTS clauses
-- - Old RLS policies are dropped and recreated to match v1.3.1 standards
-- - Indexes created for query performance
