-- Events have never had Storage infrastructure at all -- the admin event
-- form's image upload has only ever read the file as base64 and stored it
-- directly in events.image_url (confirmed live: two existing events'
-- images are ~2.9MB of base64 text each). Creates a new bucket for event
-- images, same pattern as profile-photos (048): public read, write
-- restricted to admins only, since event images are managed by admins,
-- not by the members who happen to view them.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('event-images', 'event-images', true, 5242880)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "event_images_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'event-images');

CREATE POLICY "event_images_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-images' AND is_profile_admin(auth.uid()));

CREATE POLICY "event_images_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'event-images' AND is_profile_admin(auth.uid()));

CREATE POLICY "event_images_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-images' AND is_profile_admin(auth.uid()));

-- =====================================================================
-- ROLLBACK NOTES
--
-- Dropping the policies restores nothing being able to upload event
-- images at all (the bucket would still exist but be write-locked to
-- everyone). Removing the bucket itself
-- (DELETE FROM storage.buckets WHERE id = 'event-images') would orphan
-- any images already uploaded to it -- do not do this once real event
-- images exist there.
-- =====================================================================
