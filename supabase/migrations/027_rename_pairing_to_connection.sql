-- Migration 027: Rename "Pairing" Language to "Connection" (v1.3.1)
--
-- The system has two connection-related implementations:
-- 1. NEW (Migration 010+): connection_requests, connections, connection_messages, connection_preferences
--    This is the actively used system and uses "connection" terminology
--
-- 2. OLD (schema.sql): pairings, pairing_preferences, pairing_reports
--    This is legacy schema that's not actively used in the app
--
-- This migration renames the active profile-level columns from "pairing" to "connection"
-- terminology for consistency. The legacy pairings tables are left as-is for data preservation.

-- ============================================================================
-- PART 1: Rename columns in profiles table
-- ============================================================================

-- Rename pairing_comfort_level to connection_comfort_level
ALTER TABLE profiles
RENAME COLUMN pairing_comfort_level TO connection_comfort_level;

-- Rename pairing_boundaries to connection_boundaries
ALTER TABLE profiles
RENAME COLUMN pairing_boundaries TO connection_boundaries;

-- ============================================================================
-- PART 2: Update comments in schema
-- ============================================================================

-- Note: Comments/descriptions are informational only, but good practice to update
-- SELECT pg_get_comments('pairing_comfort_level'); -- Check if any exist

-- ============================================================================
-- PART 3: Verify badges reference (update description if needed)
-- ============================================================================

-- Update badge description that still mentions "pairing"
UPDATE badges
SET description = 'Initiated a meaningful connection with another member'
WHERE id = 'connection-seeker'
AND description = 'Participated in a pairing';

-- ============================================================================
-- PART 4: Drop old pairing policies and update references if any
-- ============================================================================

-- Note: The pairings table still exists in lib/supabase/schema.sql for backward compatibility,
-- but the app code should be using the new connections system from migration 010.
-- The following are informational comments about the old system:

-- OLD TABLES (LEGACY - not removed to preserve any existing data):
-- - pairings: Individual connection pairings
-- - pairing_preferences: Individual connection preferences
-- - pairing_reports: Reports about connection pairings
--
-- NEW TABLES (ACTIVE - use these):
-- - connections: Confirmed/active connections
-- - connection_requests: Connection requests
-- - connection_messages: Messages within connections
-- - connection_preferences: Connection preferences (replaces pairing_preferences)

-- ============================================================================
-- Summary of Changes
-- ============================================================================
--
-- RENAMED COLUMNS:
-- - profiles.pairing_comfort_level → profiles.connection_comfort_level
-- - profiles.pairing_boundaries → profiles.connection_boundaries
--
-- UPDATED BADGES:
-- - connection-seeker badge description updated
--
-- CODE UPDATES NEEDED (not in migration):
-- - lib/data/pairings.ts: Rename to connections.ts or keep for backward compatibility
-- - Update interface names: PairingPreferences → ConnectionPreferences
-- - Update localStorage keys: connection-room:pairing-* → connection-room:connection-*
-- - Update all type references from Pairing* → Connection*
--
-- RATIONALE:
-- The active connections system (migration 010) uses "connection" terminology throughout.
-- Profile columns should match this to avoid confusion.
-- The legacy pairings tables are preserved for data integrity.
--
-- FUTURE WORK (v1.3.2+):
-- - Migrate any data from old pairings system to new connections system
-- - Deprecate and remove old pairing tables once migration is complete
-- - Consolidate preferences into single connection_preferences table
