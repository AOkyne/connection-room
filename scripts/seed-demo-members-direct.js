#!/usr/bin/env node

/**
 * Seed demo members to Supabase
 * Direct JavaScript version - no TypeScript compilation needed
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

// Demo members data embedded directly
const demoMembers = [
  {
    id: "demo-marcus-h",
    display_name: "Marcus",
    pronouns: "he/him",
    location: "Los Angeles, CA",
    age_range: "35-44",
    relationship_status: "Single",
    orientation: "Gay",
    profile_photo: "/demo-members/marcus-h.svg",
    member_type: "individual",
    profile_tagline: "Learning to be vulnerable",
    interests: ["intimacy", "spirituality", "embodiment", "community"],
    what_brought_you_here:
      "I was tired of surface-level connections. Wanted to find men who were actually willing to get real.",
    connection_hoping: "Deep conversations about what matters most",
    pairing_comfort_level: "Comfortable",
    quiz_result: "The Nurturer",
    completed_onboarding: true,
    spaces_joined: ["commons", "start-here", "touch-and-affection", "intimacy-patterns"],
    joined_at: new Date("2026-04-15").toISOString(),
    photo_confirmed: true,
    photo_confirmed_at: new Date("2026-04-15").toISOString(),
    show_in_member_lists: true,
    profile_visibility: "space_members",
    show_general_location: true,
    show_recent_posts: true,
    is_demo_profile: true,
  },
  {
    id: "demo-daniel-r",
    display_name: "Daniel",
    pronouns: "he/him",
    location: "San Francisco, CA",
    age_range: "28-34",
    relationship_status: "In a relationship",
    orientation: "Gay",
    profile_photo: "/demo-members/daniel-r.svg",
    member_type: "individual",
    profile_tagline: "Exploring desire with intention",
    interests: ["sexuality", "couples work", "embodiment", "dating"],
    what_brought_you_here:
      "My partner and I wanted to explore desire together in a safe space with other couples.",
    connection_hoping: "Honest conversations about what real connection looks like",
    pairing_comfort_level: "Somewhat comfortable",
    quiz_result: "The Explorer",
    completed_onboarding: true,
    spaces_joined: ["commons", "start-here", "dating-desire", "couples-closeness"],
    joined_at: new Date("2026-05-02").toISOString(),
    photo_confirmed: true,
    photo_confirmed_at: new Date("2026-05-02").toISOString(),
    show_in_member_lists: true,
    profile_visibility: "space_members",
    show_general_location: true,
    show_recent_posts: true,
    is_demo_profile: true,
  },
  {
    id: "demo-james-t",
    display_name: "James",
    pronouns: "he/him",
    location: "Portland, OR",
    age_range: "42-50",
    relationship_status: "Single",
    orientation: "Gay",
    profile_photo: "/demo-members/james-t.svg",
    member_type: "individual",
    profile_tagline: "Looking for depth in my 40s",
    interests: ["spirituality", "masculinity", "community", "intimacy"],
    what_brought_you_here:
      "I felt alone even in a city full of gay men. This space felt different—like people actually care.",
    connection_hoping: "Real friendships with men who are doing their inner work",
    pairing_comfort_level: "Comfortable",
    quiz_result: "The Philosopher",
    completed_onboarding: true,
    spaces_joined: ["commons", "start-here", "spirituality-sexuality", "masculinity-sexuality"],
    joined_at: new Date("2026-04-28").toISOString(),
    photo_confirmed: true,
    photo_confirmed_at: new Date("2026-04-28").toISOString(),
    show_in_member_lists: true,
    profile_visibility: "space_members",
    show_general_location: true,
    show_recent_posts: true,
    is_demo_profile: true,
  },
];

// Space memberships
const demoSpaceMemberships = [];
const spaceMappings = {
  "demo-marcus-h": ["commons", "start-here", "touch-and-affection", "intimacy-patterns"],
  "demo-daniel-r": ["commons", "start-here", "dating-desire", "couples-closeness"],
  "demo-james-t": ["commons", "start-here", "spirituality-sexuality", "masculinity-sexuality"],
};

Object.entries(spaceMappings).forEach(([memberId, spaceIds]) => {
  spaceIds.forEach((spaceId) => {
    demoSpaceMemberships.push({
      user_id: memberId,
      space_id: spaceId,
      joined_at: new Date().toISOString(),
    });
  });
});

async function seedDemoMembers() {
  console.log("Starting demo members seed...\n");

  try {
    // Insert demo members
    console.log(`Inserting ${demoMembers.length} demo members...`);
    const { error: insertError, data: insertedProfiles } = await supabase
      .from("profiles")
      .upsert(demoMembers, { onConflict: "id" });

    if (insertError) {
      console.error("Error inserting demo members:", insertError);
      process.exit(1);
    }

    console.log(`✓ Successfully inserted ${demoMembers.length} demo members\n`);

    // Insert space memberships
    console.log("Setting up space memberships...");

    const { error: membershipError } = await supabase
      .from("space_members")
      .upsert(demoSpaceMemberships, { onConflict: "user_id,space_id" });

    if (membershipError) {
      console.error("Error inserting space memberships:", membershipError);
      process.exit(1);
    }

    console.log(`✓ Successfully created ${demoSpaceMemberships.length} space memberships\n`);

    // Print summary
    console.log("Seed Summary:");
    console.log("─".repeat(40));

    const spaceCounts = {};
    Object.values(spaceMappings).forEach((spaceIds) => {
      spaceIds.forEach((spaceId) => {
        spaceCounts[spaceId] = (spaceCounts[spaceId] || 0) + 1;
      });
    });

    console.log("\nMembers per space:");
    Object.entries(spaceCounts).forEach(([spaceId, count]) => {
      console.log(`  ${spaceId}: ${count} members`);
    });

    console.log(`\nTotal: ${demoMembers.length} demo members`);
    console.log(`Total: ${demoSpaceMemberships.length} space memberships`);
    console.log("\n✓ Demo members seeded successfully!");
  } catch (error) {
    console.error("Unexpected error:", error);
    process.exit(1);
  }
}

seedDemoMembers();
