#!/usr/bin/env node

/**
 * Seed demo members to Supabase
 * This script populates the profiles and space_memberships tables with demo data
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

// Import demo members
const { demoMembers } = require("../lib/seed/demo-members");
const { demoSpaceMemberships } = require("../lib/seed/demo-space-memberships");

async function seedDemoMembers() {
  console.log("Starting demo members seed...\n");

  try {
    // Clear existing demo members (optional - set to false to keep)
    const clearExisting = false;
    if (clearExisting) {
      console.log("Clearing existing demo members...");
      const demoIds = demoMembers.map((m) => m.id);
      const { error: deleteError } = await supabase
        .from("profiles")
        .delete()
        .in("id", demoIds);

      if (deleteError) {
        console.error("Error clearing demo members:", deleteError);
      }
    }

    // Insert demo members
    console.log(`Inserting ${demoMembers.length} demo members...`);
    const { error: insertError, data: insertedProfiles } = await supabase
      .from("profiles")
      .upsert(
        demoMembers.map((member) => ({
          id: member.id,
          display_name: member.displayName,
          pronouns: member.pronouns,
          location: member.location,
          age_range: member.ageRange,
          relationship_status: member.relationshipStatus,
          orientation: member.orientation,
          profile_photo: member.profilePhoto,
          member_type: member.memberType,
          profile_tagline: member.profile_tagline,
          what_brought_you_here: member.whatBroughtYouHere,
          connection_hoping: member.connectionHoping,
          interests: member.interests,
          pairing_comfort_level: member.pairingComfortLevel,
          quiz_result: member.quizResult,
          completed_onboarding: member.completedOnboarding,
          spaces_joined: member.spacesJoined,
          joined_at: member.joinedAt,
          photo_confirmed: member.photo_confirmed,
          photo_confirmed_at: member.photo_confirmed_at,
          show_in_member_lists: member.show_in_member_lists !== false,
          profile_visibility: member.profile_visibility || "space_members",
          show_general_location: member.show_general_location !== false,
          show_recent_posts: member.show_recent_posts !== false,
          is_demo_profile: true,
        })),
        { onConflict: "id" }
      );

    if (insertError) {
      console.error("Error inserting demo members:", insertError);
      process.exit(1);
    }

    console.log(`✓ Successfully inserted ${demoMembers.length} demo members\n`);

    // Insert space memberships
    console.log("Setting up space memberships...");
    const spaceMemberships = [];
    let totalMemberships = 0;

    Object.entries(demoSpaceMemberships).forEach(([memberId, spaceIds]) => {
      spaceIds.forEach((spaceId) => {
        spaceMemberships.push({
          user_id: memberId,
          space_id: spaceId,
          joined_at: new Date().toISOString(),
        });
        totalMemberships++;
      });
    });

    // Clear existing demo space memberships (optional)
    if (clearExisting) {
      const demoIds = demoMembers.map((m) => m.id);
      const { error: deleteMembershipError } = await supabase
        .from("space_members")
        .delete()
        .in("user_id", demoIds);

      if (deleteMembershipError) {
        console.error(
          "Error clearing space memberships:",
          deleteMembershipError
        );
      }
    }

    const { error: membershipError } = await supabase
      .from("space_members")
      .upsert(spaceMemberships, { onConflict: "user_id,space_id" });

    if (membershipError) {
      console.error("Error inserting space memberships:", membershipError);
      process.exit(1);
    }

    console.log(
      `✓ Successfully created ${totalMemberships} space memberships\n`
    );

    // Print summary
    console.log("Seed Summary:");
    console.log("─".repeat(40));

    const spaceCounts = {};
    demoMembers.forEach((member) => {
      member.spacesJoined?.forEach((spaceId) => {
        spaceCounts[spaceId] = (spaceCounts[spaceId] || 0) + 1;
      });
    });

    console.log("\nMembers per space:");
    Object.entries(spaceCounts).forEach(([spaceId, count]) => {
      console.log(`  ${spaceId}: ${count} members`);
    });

    console.log(`\nTotal: ${demoMembers.length} demo members`);
    console.log(`Total: ${totalMemberships} space memberships`);
    console.log("\n✓ Demo members seeded successfully!");
  } catch (error) {
    console.error("Unexpected error:", error);
    process.exit(1);
  }
}

seedDemoMembers();
