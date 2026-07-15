-- Fix event_registrations schema to match what the app actually writes:
-- add name/email for guest display, and allow 'interested' as a status
-- (previously only registered/cancelled/attended/no_show were allowed).

ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_status_check;

ALTER TABLE event_registrations
  ADD CONSTRAINT event_registrations_status_check
  CHECK (status IN ('registered', 'interested', 'cancelled', 'attended', 'no_show'));

-- profile_id + status was implicitly unique per (event_id, profile_id) via migration 012's
-- UNIQUE(event_id, profile_id). markAsInterested relies on upserting on that same pair.
