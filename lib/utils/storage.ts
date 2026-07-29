/**
 * Supabase Storage utilities for profile photos and other media
 */

import { supabase } from "@/lib/supabase/client";
import { resizeAndCompressImage } from "@/lib/utils/image";

const BUCKET_NAME = "profile-photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB, checked against the original file before compression

// iPhone cameras shoot HEIC/HEIF by default. WebKit's native Photos picker
// transparently transcodes to JPEG on the way into the browser in many
// cases, but that's not guaranteed -- picking a photo via the Files app,
// iCloud Drive, or a Shared Album can hand the browser the original
// `image/heic` file, which this whitelist previously rejected outright
// with no attempt to even try decoding it. resizeAndCompressImage() always
// re-encodes to JPEG via canvas regardless of source format, and Safari
// (uniquely among major browsers) can decode HEIC natively via
// createImageBitmap/<img>, so accepting it here and letting the existing
// decode path attempt it is strictly better than rejecting by MIME string
// before ever trying.
const ACCEPTED_PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/gif", "image/heic", "image/heif"];

/**
 * Whether a file is acceptable to attempt as a profile photo. Some iOS file
 * pickers (Files app / iCloud Drive / Shared Albums, rather than the
 * native Photos picker) report an empty or generic `file.type` for HEIC
 * files instead of "image/heic" -- fall back to checking the extension in
 * that case rather than rejecting a file we can very likely still decode.
 */
export function isAcceptableProfilePhotoFile(file: File): boolean {
  if (ACCEPTED_PROFILE_PHOTO_TYPES.includes(file.type)) return true;
  if (!file.type || file.type === "application/octet-stream") {
    return /\.(heic|heif|jpe?g|png|gif)$/i.test(file.name);
  }
  return false;
}

export interface UploadedPhoto {
  publicUrl: string;
  path: string;
}

/**
 * Builds a profile photo's public URL from its Storage path alone, without
 * needing a Supabase client instance -- used by server-side read paths
 * (API routes on the service-role key) where constructing a client just to
 * call getPublicUrl() would be overkill for a public bucket's URL, which is
 * a pure string formula.
 */
export function buildProfilePhotoUrl(path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${path}`;
}

/**
 * Upload a profile photo to Supabase Storage. Resizes/compresses to a JPEG
 * (max 800px, ~85% quality) before uploading -- this is what actually keeps
 * new uploads small, not just where the bytes end up; see
 * lib/utils/image.ts. No base64 fallback: the profile-photos bucket's RLS
 * was the only thing ever blocking real uploads (fixed in migration 048),
 * so a failure here is a real failure to surface to the member, not a
 * signal to fall back to storing the image in Postgres again.
 * @param file File to upload
 * @param userId User ID to organize photos
 * @returns The public URL and Storage path of the uploaded photo
 */
export async function uploadProfilePhoto(
  file: File,
  userId: string
): Promise<UploadedPhoto> {
  if (!supabase) {
    throw new Error("Photo upload is not available right now. Please try again shortly.");
  }

  // Validate file size (against the original -- compression happens after
  // this check, so a huge phone-camera photo still gets a clear error
  // instead of silently taking a long time to process).
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large. Max size is 5MB (your file is ${(file.size / 1024 / 1024).toFixed(1)}MB)`
    );
  }

  // Validate file type
  if (!isAcceptableProfilePhotoFile(file)) {
    throw new Error("File must be JPG, PNG, GIF, or HEIC");
  }

  const compressed = await resizeAndCompressImage(file);

  const fileName = `${userId}-${Date.now()}.jpg`;
  const filePath = `${userId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, compressed, {
      cacheControl: "3600",
      upsert: false,
      contentType: "image/jpeg",
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error(`Failed to upload photo: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  return { publicUrl, path: data.path };
}

/**
 * Delete a profile photo from storage
 * @param userId User ID
 */
export async function deleteProfilePhoto(userId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    // List all photos for this user
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(userId);

    if (listError) {
      console.warn("Could not list photos for deletion:", listError);
      return false;
    }

    if (!files || files.length === 0) return true;

    // Delete all files for this user
    const filePaths = files.map((f) => `${userId}/${f.name}`);
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths);

    if (deleteError) {
      console.warn("Could not delete photos:", deleteError);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error deleting profile photos:", err);
    return false;
  }
}

/**
 * Check if a URL is a storage URL (vs base64)
 */
export function isStorageUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes("supabase") || url.startsWith("http");
}

/**
 * Check if a URL is base64 encoded
 */
export function isBase64Url(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith("data:image/");
}

const EVENT_IMAGES_BUCKET = "event-images";

/**
 * Upload an event image to Supabase Storage. Admin-only (enforced by
 * Storage RLS on the event-images bucket, migration 049) -- events
 * previously only ever stored images as base64 directly in
 * events.image_url, which some existing events still have (multi-MB
 * text in the database row); this is the equivalent of
 * uploadProfilePhoto() for events.
 * @param file File to upload
 * @param eventId Event ID to organize images (or a temp id for new events)
 * @returns Public URL of the uploaded image, or null if upload fails
 */
export async function uploadEventImage(
  file: File,
  eventId: string
): Promise<string | null> {
  if (!supabase) {
    console.warn("Supabase not configured, cannot upload image");
    return null;
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large. Max size is 5MB (your file is ${(file.size / 1024 / 1024).toFixed(1)}MB)`
    );
  }

  if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
    throw new Error("File must be JPG, PNG, or GIF");
  }

  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${eventId}-${Date.now()}.${fileExt}`;
    const filePath = `${eventId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(EVENT_IMAGES_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(EVENT_IMAGES_BUCKET).getPublicUrl(data.path);

    return publicUrl;
  } catch (err) {
    console.error("Error uploading event image:", err);
    return null; // Return null to trigger base64 fallback in components
  }
}

const BROADCAST_IMAGES_BUCKET = "broadcast-images";

/**
 * Upload an image inserted into an admin broadcast email to Supabase
 * Storage (migration 051). Emails need a real hosted URL for images --
 * unlike profile/event photos there's no base64 fallback here, since a
 * multi-MB data URI inline in every recipient's email would be both huge
 * and likely to get the message flagged as spam.
 * @param file File to upload
 * @param adminUserId The composing admin's Supabase user id, to namespace uploads
 * @returns Public URL of the uploaded image, or null if upload fails
 */
export async function uploadBroadcastImage(
  file: File,
  adminUserId: string
): Promise<string | null> {
  if (!supabase) {
    console.warn("Supabase not configured, cannot upload image");
    return null;
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large. Max size is 5MB (your file is ${(file.size / 1024 / 1024).toFixed(1)}MB)`
    );
  }

  if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
    throw new Error("File must be JPG, PNG, or GIF");
  }

  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${adminUserId}-${Date.now()}.${fileExt}`;
    const filePath = `${adminUserId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(BROADCAST_IMAGES_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BROADCAST_IMAGES_BUCKET).getPublicUrl(data.path);

    return publicUrl;
  } catch (err) {
    console.error("Error uploading broadcast image:", err);
    return null;
  }
}
