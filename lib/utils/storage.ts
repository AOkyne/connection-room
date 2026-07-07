/**
 * Supabase Storage utilities for profile photos and other media
 */

import { supabase } from "@/lib/supabase/client";

const BUCKET_NAME = "profile-photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload a profile photo to Supabase Storage
 * @param file File to upload
 * @param userId User ID to organize photos
 * @returns Public URL of the uploaded photo, or null if upload fails
 */
export async function uploadProfilePhoto(
  file: File,
  userId: string
): Promise<string | null> {
  if (!supabase) {
    console.warn("Supabase not configured, cannot upload photo");
    return null;
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large. Max size is 5MB (your file is ${(file.size / 1024 / 1024).toFixed(1)}MB)`
    );
  }

  // Validate file type
  if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
    throw new Error("File must be JPG, PNG, or GIF");
  }

  try {
    // Create a unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

    return publicUrl;
  } catch (err) {
    console.error("Error uploading profile photo:", err);
    return null; // Return null to trigger base64 fallback in components
  }
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
