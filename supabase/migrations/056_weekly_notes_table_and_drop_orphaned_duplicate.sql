-- Resolves the weekly_notes / weekly_companion_notes discrepancy flagged
-- during the 2026-07 documentation audit (see DATABASE_SCHEMA.md "Known
-- schema risks").
--
-- The application (lib/data/daily-companion.ts's getTrevorWeeklyNote())
-- has always queried a table named `weekly_notes`. Migration 024 instead
-- created a same-purpose table named `weekly_companion_notes` -- the app
-- was never updated to match, or the table was renamed outside this
-- repo's tracked migration history; either way, `weekly_notes` is
-- confirmed live and populated in production (direct query during the
-- documentation audit returned real seeded rows), and is what the app
-- has been correctly reading all along. `weekly_companion_notes` has zero
-- application code references (confirmed by repo-wide search) -- it is
-- the orphaned one.
--
-- This migration is intentionally idempotent (CREATE TABLE IF NOT EXISTS,
-- DROP POLICY IF EXISTS + CREATE POLICY) so it is safe to run whether or
-- not `weekly_notes` already exists live with its own RLS, and brings its
-- admin policy onto the correct is_profile_admin() pattern regardless --
-- weekly_companion_notes's own admin policy used yet a third, different
-- broken check (auth.jwt() ->> 'role' = 'admin', a JWT custom claim this
-- app has never actually set; the app's admin flag lives in
-- profiles.role), so no assumption is made that the live weekly_notes
-- table's own RLS, if any, was already correct.

CREATE TABLE IF NOT EXISTS weekly_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  rotation_index INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (week_number)
);

CREATE INDEX IF NOT EXISTS idx_weekly_notes_rotation_index ON weekly_notes(rotation_index);
CREATE INDEX IF NOT EXISTS idx_weekly_notes_active ON weekly_notes(active);

ALTER TABLE weekly_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_notes_public_read" ON weekly_notes;
CREATE POLICY "weekly_notes_public_read"
  ON weekly_notes FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "weekly_notes_admin" ON weekly_notes;
CREATE POLICY "weekly_notes_admin"
  ON weekly_notes FOR ALL
  USING (is_profile_admin(auth.uid()))
  WITH CHECK (is_profile_admin(auth.uid()));

-- weekly_companion_notes is dropped, not just left alone: keeping an
-- unused, same-purpose duplicate table around is exactly the kind of
-- ambiguity that caused this discrepancy to go unnoticed in the first
-- place. Safe: confirmed zero application code references before writing
-- this migration.
DROP TABLE IF EXISTS weekly_companion_notes;

-- =====================================================================
-- ROLLBACK NOTES
--
-- weekly_notes: this table is load-bearing in production (confirmed live
-- data) -- do not drop it. Reverting its admin policy to the
-- id = auth.uid() or auth.jwt() ->> 'role' patterns would restore a
-- non-functional admin check.
--
-- weekly_companion_notes: there is no reason to recreate it -- it was
-- never read by any application code, and weekly_notes is the
-- confirmed-authoritative table for this content.
-- =====================================================================
