-- The profile-photos Storage bucket exists (created 2026-07-05, public)
-- and lib/utils/storage.ts's uploadProfilePhoto() has always tried it
-- first -- but storage.objects (the table Supabase Storage uses
-- internally for every bucket) had no RLS policy granting insert access
-- to it at all. Confirmed live: a real authenticated upload attempt
-- returned 403 "new row violates row-level security policy". Every photo
-- upload has therefore always fallen through to this app's base64
-- fallback (found live: Trevor's own profile_photo is a 4.3MB base64
-- string, which caused several real bugs today -- see the "Guest"/"Admin"
-- session-fallback fixes earlier in this migration sequence). The bucket
-- and the client-side upload code were both already correct; only the
-- permission to actually use them was missing.
--
-- Upload paths are "{user_id}/{filename}", written by uploadProfilePhoto()
-- and read by deleteProfilePhoto() -- policies below scope write access to
-- each user's own folder using that same convention.

CREATE POLICY "profile_photos_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'profile-photos');

CREATE POLICY "profile_photos_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "profile_photos_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "profile_photos_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- ROLLBACK NOTES
--
-- Dropping these policies restores the original broken state (uploads
-- fail with a 403, silently falling back to base64) -- do not do this
-- without a specific reason:
--   DROP POLICY IF EXISTS "profile_photos_public_read" ON storage.objects;
--   DROP POLICY IF EXISTS "profile_photos_owner_insert" ON storage.objects;
--   DROP POLICY IF EXISTS "profile_photos_owner_update" ON storage.objects;
--   DROP POLICY IF EXISTS "profile_photos_owner_delete" ON storage.objects;
-- =====================================================================
