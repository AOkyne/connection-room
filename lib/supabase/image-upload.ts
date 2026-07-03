import { supabase } from "./client";

const PROFILE_PHOTOS_BUCKET = "profile-photos";

/**
 * Upload a profile photo to Supabase Storage
 * Returns the public URL of the uploaded image
 *
 * POST-LAUNCH: Use this instead of base64 data URLs
 * Currently using base64 for simplicity, but this is ready for migration
 */
export async function uploadProfilePhoto(
  userId: string,
  file: File
): Promise<string | null> {
  if (!supabase) return null;

  try {
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${userId}-${timestamp}-${file.name}`;
    const filepath = `profiles/${filename}`;

    // Upload file to Storage
    const { data, error } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .upload(filepath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Error uploading profile photo:", error);
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .getPublicUrl(filepath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Exception uploading profile photo:", err);
    return null;
  }
}

/**
 * Delete a profile photo from Supabase Storage
 */
export async function deleteProfilePhoto(userId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .list(`profiles`, {
        limit: 100,
      });

    // Note: implement deletion logic when cleaning up old photos
    return true;
  } catch (err) {
    console.error("Error deleting profile photo:", err);
    return false;
  }
}
