-- Storage bucket for images inserted into admin broadcast emails (the
-- "Image" toolbar button in the broadcast composer). Mirrors migration
-- 049's event-images bucket: public read (so email clients can load the
-- image from its URL), admin-only write since only admins compose
-- broadcasts.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('broadcast-images', 'broadcast-images', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- DROP + CREATE (rather than a bare CREATE like 049 used) so this migration
-- can be safely re-run if it partially applied on a prior attempt.
DROP POLICY IF EXISTS "broadcast_images_public_read" ON storage.objects;
CREATE POLICY "broadcast_images_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'broadcast-images');

DROP POLICY IF EXISTS "broadcast_images_admin_insert" ON storage.objects;
CREATE POLICY "broadcast_images_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'broadcast-images' AND is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "broadcast_images_admin_update" ON storage.objects;
CREATE POLICY "broadcast_images_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'broadcast-images' AND is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS "broadcast_images_admin_delete" ON storage.objects;
CREATE POLICY "broadcast_images_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'broadcast-images' AND is_profile_admin(auth.uid()));
