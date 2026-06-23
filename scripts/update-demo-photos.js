#!/usr/bin/env node

/**
 * Update demo member photos to use PNG files instead of SVGs
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables required"
  );
  process.exit(1);
}

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Map of user_ids to new photo URLs
const photoUpdates = {
  "demo-marcus-h": "/demo-members/seed-man-01.png",
  "demo-daniel-r": "/demo-members/seed-man-02.png",
  "demo-james-t": "/demo-members/seed-man-03.png",
  "demo-alex-m": "/demo-members/seed-man-04.png",
  "demo-chris-w": "/demo-members/seed-man-05.png",
  "demo-jordan-k": "/demo-members/seed-man-06.png",
  "demo-david-l": "/demo-members/seed-man-07.png",
  "demo-ryan-p": "/demo-members/seed-man-08.png",
  "demo-sammy-c": "/demo-members/seed-man-09.png",
  "demo-noah-g": "/demo-members/seed-man-10.png",
  "demo-ethan-b": "/demo-members/seed-man-11.png",
  "demo-liam-s": "/demo-members/seed-man-12.png",
  "demo-mason-h": "/demo-members/seed-man-13.png",
  "demo-lucas-j": "/demo-members/seed-man-14.png",
  "demo-oliver-f": "/demo-members/seed-man-15.png",
  "demo-aiden-n": "/demo-members/seed-man-16.png",
  "demo-isaac-b": "/demo-members/seed-man-17.png",
  "demo-michael-p": "/demo-members/seed-man-18.png",
  "demo-william-r": "/demo-members/seed-man-19.png",
  "demo-benjamin-m": "/demo-members/seed-man-20.png",
  "demo-jacob-d": "/demo-members/seed-man-21.png",
  "demo-henry-c": "/demo-members/seed-man-22.png",
  "demo-tyler-w": "/demo-members/seed-man-23.png",
  "demo-gabriel-h": "/demo-members/seed-man-24.png",
};

async function updatePhotos() {
  console.log("Updating demo member photos to PNG files...\n");

  try {
    // Create mapping from display name to PNG URL
    const nameToPhoto = {
      Marcus: "/demo-members/seed-man-01.png",
      Daniel: "/demo-members/seed-man-02.png",
      James: "/demo-members/seed-man-03.png",
      Alex: "/demo-members/seed-man-04.png",
      Chris: "/demo-members/seed-man-05.png",
      Jordan: "/demo-members/seed-man-06.png",
      David: "/demo-members/seed-man-07.png",
      Ryan: "/demo-members/seed-man-08.png",
      Sammy: "/demo-members/seed-man-09.png",
      Noah: "/demo-members/seed-man-10.png",
      Ethan: "/demo-members/seed-man-11.png",
      Liam: "/demo-members/seed-man-12.png",
      Mason: "/demo-members/seed-man-13.png",
      Lucas: "/demo-members/seed-man-14.png",
      Oliver: "/demo-members/seed-man-15.png",
      Aiden: "/demo-members/seed-man-16.png",
      Isaac: "/demo-members/seed-man-17.png",
      Michael: "/demo-members/seed-man-18.png",
      William: "/demo-members/seed-man-19.png",
      Benjamin: "/demo-members/seed-man-20.png",
      Jacob: "/demo-members/seed-man-21.png",
      Henry: "/demo-members/seed-man-22.png",
      Tyler: "/demo-members/seed-man-23.png",
      Gabriel: "/demo-members/seed-man-24.png",
    };

    let successCount = 0;
    let errorCount = 0;

    // Update each known demo member by display name
    for (const [displayName, newPhotoUrl] of Object.entries(nameToPhoto)) {
      console.log(`Updating ${displayName}...`);

      const { error } = await supabase
        .from("profiles")
        .update({ profile_photo: newPhotoUrl })
        .eq("display_name", displayName);

      if (error) {
        console.error(`✗ Failed to update ${displayName}: ${error.message}`);
        errorCount++;
      } else {
        console.log(`✓ Updated ${displayName} → ${newPhotoUrl}`);
        successCount++;
      }
    }

    console.log("\n" + "─".repeat(50));
    console.log(`\nUpdate Summary:`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Failed: ${errorCount}`);
    console.log(`  Total: ${successCount + errorCount}`);

    if (errorCount === 0) {
      console.log("\n✓ All demo member photos updated successfully!");
    } else {
      console.log(`\n⚠ ${errorCount} updates failed. Please check the errors above.`);
      process.exit(1);
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    process.exit(1);
  }
}

updatePhotos();
