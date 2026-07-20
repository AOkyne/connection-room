#!/usr/bin/env node

/**
 * One-time (but safely re-runnable) backfill: moves existing
 * profiles.profile_photo base64 data URLs into Supabase Storage
 * (the "profile-photos" bucket, migration 048) and records the result in
 * profiles.profile_photo_path / profile_photo_updated_at (migration 064).
 *
 * Root cause this fixes: profiles.profile_photo and (via the
 * sync_public_profile() trigger) public_profiles.profile_photo have always
 * stored the photo itself as base64 text directly in Postgres -- confirmed
 * live: 93 rows, ~58MB of current logical data per table, largest single
 * row ~6.3MB, contributing directly to a reported Supabase health incident
 * (memory pressure, swap, I/O wait, oversized TOAST tables).
 *
 * Safety:
 *  - Only ever SELECTs rows where profile_photo_path IS NULL, so this is
 *    idempotent and safe to re-run (e.g. if it's interrupted partway, or
 *    to pick up any row that slipped through before the app-layer changes
 *    in migration 064 shipped).
 *  - Never touches or clears profiles.profile_photo. The legacy column is
 *    left completely alone -- this script only ever adds new columns'
 *    values, it does not delete anything. Actually reclaiming the TOAST
 *    storage this represents requires a separate, later, explicit decision
 *    to null out profile_photo once the path-based flow has been verified
 *    in production (deliberately out of scope here, see migration 064's
 *    own comment).
 *  - Resizes/compresses to a JPEG (max 800px, ~85% quality, same target as
 *    the client-side resize in lib/utils/image.ts) via sharp before
 *    uploading -- this is what actually shrinks the data, not just moves
 *    the same multi-MB bytes into Storage.
 *
 * Usage: node scripts/migrate-profile-photos-to-storage.mjs [--dry-run]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

function loadEnv() {
  const envPath = path.join(projectRoot, ".env.local");
  const env = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  }
  return { ...env, ...process.env };
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes("--dry-run");
const BUCKET_NAME = "profile-photos";
const MAX_DIMENSION = 800;
const JPEG_QUALITY = 85;
const CONCURRENCY = 3;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function decodeDataUrl(dataUrl) {
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return Buffer.from(match[1], "base64");
}

async function migrateRow(row) {
  const { user_id: userId, profile_photo: dataUrl } = row;

  const originalBuffer = decodeDataUrl(dataUrl);
  if (!originalBuffer) {
    return { userId, status: "skipped", reason: "profile_photo is not a base64 data URL" };
  }

  const originalBytes = originalBuffer.length;

  let compressed;
  try {
    compressed = await sharp(originalBuffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }) // matches lib/utils/image.ts's canvas fill for transparent PNGs
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
  } catch (err) {
    return { userId, status: "failed", reason: `Could not process image: ${err.message}` };
  }

  const filePath = `${userId}/${Date.now()}-migrated.jpg`;

  if (DRY_RUN) {
    return {
      userId,
      status: "would-migrate",
      originalBytes,
      compressedBytes: compressed.length,
      filePath,
    };
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, compressed, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });

  if (uploadError) {
    return { userId, status: "failed", reason: `Upload failed: ${uploadError.message}` };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ profile_photo_path: filePath, profile_photo_updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (updateError) {
    // Uploaded but failed to record it -- leave the orphaned Storage object
    // (harmless, tiny) rather than attempting a delete that could itself
    // fail; the next run will just re-upload and overwrite the path since
    // this row still has profile_photo_path IS NULL.
    return { userId, status: "failed", reason: `DB update failed after upload: ${updateError.message}` };
  }

  return { userId, status: "migrated", originalBytes, compressedBytes: compressed.length, filePath };
}

async function main() {
  console.log(DRY_RUN ? "DRY RUN -- no uploads or writes will happen.\n" : "Starting migration...\n");

  const { data: rows, error } = await supabase
    .from("profiles")
    .select("user_id, profile_photo")
    .not("profile_photo", "is", null)
    .is("profile_photo_path", null);

  if (error) throw error;

  console.log(`Found ${rows.length} profile(s) with a legacy photo not yet migrated.\n`);

  const results = [];
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(migrateRow));
    for (const r of batchResults) {
      results.push(r);
      const bytesNote =
        r.originalBytes != null
          ? ` (${(r.originalBytes / 1024).toFixed(0)}KB -> ${(r.compressedBytes / 1024).toFixed(0)}KB)`
          : "";
      console.log(`[${r.status}] ${r.userId}${bytesNote}${r.reason ? ` -- ${r.reason}` : ""}`);
    }
  }

  const migrated = results.filter((r) => r.status === "migrated" || r.status === "would-migrate");
  const skipped = results.filter((r) => r.status === "skipped");
  const failed = results.filter((r) => r.status === "failed");
  const totalOriginal = migrated.reduce((sum, r) => sum + (r.originalBytes || 0), 0);
  const totalCompressed = migrated.reduce((sum, r) => sum + (r.compressedBytes || 0), 0);

  console.log("\n--- Summary ---");
  console.log(`Migrated: ${migrated.length}`);
  console.log(`Skipped (not a base64 data URL): ${skipped.length}`);
  console.log(`Failed: ${failed.length}`);
  if (migrated.length > 0) {
    console.log(
      `Bytes: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB original -> ${(totalCompressed / 1024 / 1024).toFixed(2)}MB compressed` +
        ` (${(100 - (totalCompressed / totalOriginal) * 100).toFixed(0)}% smaller)`
    );
  }
  if (failed.length > 0) {
    console.log("\nFailed rows (safe to re-run this script to retry them):");
    for (const r of failed) console.log(`  ${r.userId}: ${r.reason}`);
  }
}

main().catch((err) => {
  console.error("MIGRATION FAILED:", err);
  process.exit(1);
});
