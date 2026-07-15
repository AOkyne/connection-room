-- Migration 026: Add Platform Settings Table (v1.3.1)
--
-- Creates a configurable settings table for platform-wide configuration.
-- Removes hardcoded values (launch date, timezone) and makes them database-backed.
--
-- This allows admins to adjust critical settings without code changes or redeploys.

-- ============================================================================
-- PART 1: Create platform_settings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(setting_key);

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Create RLS policies for platform_settings
-- ============================================================================

-- Everyone can read non-secret settings (public config)
DROP POLICY IF EXISTS "settings_public_read" ON platform_settings;
CREATE POLICY "settings_public_read"
  ON platform_settings
  FOR SELECT
  USING (is_secret = false);

-- Only admin can read secret settings
DROP POLICY IF EXISTS "settings_admin_read_secret" ON platform_settings;
CREATE POLICY "settings_admin_read_secret"
  ON platform_settings
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- Only admin can modify settings
DROP POLICY IF EXISTS "settings_admin_modify" ON platform_settings;
CREATE POLICY "settings_admin_modify"
  ON platform_settings
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- PART 3: Insert default platform settings
-- ============================================================================

-- Daily Companion Launch Date
-- The date from which the 120-day rotation cycle began
INSERT INTO platform_settings (setting_key, setting_value, description, is_secret)
VALUES (
  'daily_companion_launch_date',
  '"2024-01-01"'::jsonb,
  'Launch date for daily companion content rotation (ISO 8601 format). Rotation cycle begins from this date.',
  false
)
ON CONFLICT (setting_key) DO NOTHING;

-- Platform Timezone
-- Used for determining "today" in daily content rotation
INSERT INTO platform_settings (setting_key, setting_value, description, is_secret)
VALUES (
  'platform_timezone',
  '"America/Los_Angeles"'::jsonb,
  'Platform timezone for daily content rotation. Daily content changes at midnight in this timezone.',
  false
)
ON CONFLICT (setting_key) DO NOTHING;

-- Daily Rotation Cycle Length
-- Number of days in the rotation cycle (currently 120)
INSERT INTO platform_settings (setting_key, setting_value, description, is_secret)
VALUES (
  'daily_rotation_cycle_days',
  '120'::jsonb,
  'Number of days in the daily companion content rotation cycle.',
  false
)
ON CONFLICT (setting_key) DO NOTHING;

-- Weekly Rotation Cycle Length
-- Number of weeks in the rotation cycle (currently 16)
INSERT INTO platform_settings (setting_key, setting_value, description, is_secret)
VALUES (
  'weekly_rotation_cycle_weeks',
  '16'::jsonb,
  'Number of weeks in the weekly companion notes rotation cycle.',
  false
)
ON CONFLICT (setting_key) DO NOTHING;

-- Feature Flags
INSERT INTO platform_settings (setting_key, setting_value, description, is_secret)
VALUES (
  'feature_daily_companion_enabled',
  'true'::jsonb,
  'Enable/disable daily companion feature for all members.',
  false
)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO platform_settings (setting_key, setting_value, description, is_secret)
VALUES (
  'feature_spaces_enabled',
  'true'::jsonb,
  'Enable/disable spaces (community rooms) feature.',
  false
)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO platform_settings (setting_key, setting_value, description, is_secret)
VALUES (
  'feature_connections_enabled',
  'true'::jsonb,
  'Enable/disable connections (1-on-1 matching) feature.',
  false
)
ON CONFLICT (setting_key) DO NOTHING;

-- Maintenance Mode
INSERT INTO platform_settings (setting_key, setting_value, description, is_secret)
VALUES (
  'maintenance_mode_enabled',
  'false'::jsonb,
  'Enable maintenance mode to show maintenance page to all users.',
  false
)
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- PART 4: Create helper functions to read settings
-- ============================================================================

-- Function to get a setting value as text
CREATE OR REPLACE FUNCTION get_platform_setting(key TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT setting_value::text FROM platform_settings WHERE setting_key = key LIMIT 1;
$$;

-- Function to get a setting value as JSONB
CREATE OR REPLACE FUNCTION get_platform_setting_json(key TEXT)
RETURNS JSONB
LANGUAGE SQL
STABLE
AS $$
  SELECT setting_value FROM platform_settings WHERE setting_key = key LIMIT 1;
$$;

-- Function to check if a feature is enabled
CREATE OR REPLACE FUNCTION is_feature_enabled(feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE((setting_value::text = 'true'), false)
  FROM platform_settings
  WHERE setting_key = 'feature_' || feature_key;
$$;

-- ============================================================================
-- Summary of Changes
-- ============================================================================
--
-- NEW TABLE:
-- - platform_settings: Centralized configuration store
--
-- SEEDED SETTINGS:
-- - daily_companion_launch_date: "2024-01-01"
-- - platform_timezone: "America/Los_Angeles"
-- - daily_rotation_cycle_days: 120
-- - weekly_rotation_cycle_weeks: 16
-- - feature_daily_companion_enabled: true
-- - feature_spaces_enabled: true
-- - feature_connections_enabled: true
-- - maintenance_mode_enabled: false
--
-- ACCESS CONTROL:
-- - Public read for non-secret settings
-- - Admin-only write/update
-- - Secret settings (is_secret=true) admin-only read
--
-- BENEFITS:
-- - No hardcoded launch date or timezone
-- - Admins can adjust settings without code changes
-- - Feature flags for gradual rollout or maintenance
-- - Extensible for future settings
--
-- USAGE IN CODE:
-- - Call get_platform_setting('daily_companion_launch_date') to read
-- - Server-side helpers can cache these values for performance
-- - Frontend can fetch via public API (non-secret settings)
--
-- FUTURE ENHANCEMENTS:
-- - Audit logging for setting changes
-- - Settings UI in admin dashboard
-- - Per-user setting overrides
-- - A/B testing setup with feature flags
