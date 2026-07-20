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
      .rotate() // no-args form: auto-orient from the EXIF tag, then strip it -- without this, a phone photo's
                // landscape-stored pixels get resized/flattened as-is and the rotation instruction is lost for
                // good once re-encoded (this base64 source displayed correctly via <img>, which honors EXIF
                // orientation itself, but sharp does not unless told to)
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

  // Bulk-selecting profile_photo across every matching row in one query
  // hits Postgres's statement timeout outright (confirmed live, same
  // issue as getAllProfiles()/getProfilePhotosByIds() elsewhere in this
  // codebase) -- some legacy photos are multi-MB base64 text. Get the
  // (cheap) list of ids needing migration first, then fetch each row's
  // actual photo data in small chunks right before processing it.
  const { data: allIdRows, error: idError } = await supabase
    .from("profiles")
    .select("user_id")
    .not("profile_photo", "is", null)
    .is("profile_photo_path", null);

  if (idError) throw idError;

  // A handful of rows have user_id IS NULL (orphaned data, unreachable by
  // any real code path since every read/write keys off user_id) -- these
  // can never be migrated and, left in, poison every .in() chunk they land
  // in (Postgres rejects "null" as a uuid literal), which looks like mass
  // failure across unrelated rows. Filter and report separately instead.
  const idRows = allIdRows.filter((r) => r.user_id !== null);
  const orphanedCount = allIdRows.length - idRows.length;

  console.log(`Found ${idRows.length} profile(s) with a legacy photo not yet migrated.`);
  if (orphanedCount > 0) {
    console.log(`Skipping ${orphanedCount} orphaned row(s) with no user_id (cannot be migrated or read by the app).`);
  }
  console.log("");

  const CHUNK_SIZE = 5;
  const results = [];
  for (let i = 0; i < idRows.length; i += CHUNK_SIZE) {
    const chunkIds = idRows.slice(i, i + CHUNK_SIZE).map((r) => r.user_id);
    const { data: rows, error } = await supabase
      .from("profiles")
      .select("user_id, profile_photo")
      .in("user_id", chunkIds);

    if (error) {
      for (const userId of chunkIds) {
        results.push({ userId, status: "failed", reason: `Could not fetch photo data: ${error.message}` });
      }
      continue;
    }

    for (let j = 0; j < rows.length; j += CONCURRENCY) {
      const batch = rows.slice(j, j + CONCURRENCY);
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
