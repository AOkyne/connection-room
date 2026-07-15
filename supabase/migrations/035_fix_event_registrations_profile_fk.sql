-- event_registrations.profile_id was defined (migration 012) as a foreign key to
-- profiles(id) -- the profiles table's own internal primary key. But the app (and
-- this table's own RLS policies, e.g. "auth.uid() = profile_id") always uses the
-- Supabase Auth user id, which lives in profiles.user_id, a *different* UUID.
-- No value can satisfy both the FK and the RLS check as originally written, so
-- every registration insert fails. Retarget the FK to profiles(user_id) to match
-- what the app actually sends and what RLS already expects.
--
-- Safe to run: event_registrations has no rows yet (every prior insert attempt
-- failed on this exact mismatch).

ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_profile_id_fkey;

ALTER TABLE event_registrations
  ADD CONSTRAINT event_registrations_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
