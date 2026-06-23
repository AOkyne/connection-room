#!/usr/bin/env node

/**
 * Seed demo members to Supabase - Simple version
 * Uses only existing schema columns
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

// Demo members - using only existing schema fields
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
    what_brought_you_here:
      "I was tired of surface-level connections. Wanted to find men who were actually willing to get real.",
    connection_hoping: "Deep conversations about what matters most",
    interests: ["intimacy", "spirituality", "embodiment", "community"],
    pairing_comfort_level: "Comfortable",
    quiz_result: "The Nurturer",
    completed_onboarding: true,
    spaces_joined: ["commons", "start-here", "touch-and-affection", "intimacy-patterns"],
    joined_at: new Date("2026-04-15").toISOString(),
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
    what_brought_you_here:
      "My partner and I wanted to explore desire together in a safe space with other couples.",
    connection_hoping: "Honest conversations about what real connection looks like",
    interests: ["sexuality", "couples work", "embodiment", "dating"],
    pairing_comfort_level: "Somewhat comfortable",
    quiz_result: "The Explorer",
    completed_onboarding: true,
    spaces_joined: ["commons", "start-here", "dating-desire", "couples-closeness"],
    joined_at: new Date("2026-05-02").toISOString(),
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
    what_brought_you_here:
      "I felt alone even in a city full of gay men. This space felt different—like people actually care.",
    connection_hoping: "Real friendships with men who are doing their inner work",
    interests: ["spirituality", "masculinity", "community", "intimacy"],
    pairing_comfort_level: "Comfortable",
    quiz_result: "The Philosopher",
    completed_onboarding: true,
    spaces_joined: ["commons", "start-here", "spirituality-sexuality", "masculinity-sexuality"],
    joined_at: new Date("2026-04-28").toISOString(),
  },
  {
    id: "demo-alex-m",
    display_name: "Alex",
    pronouns: "he/him",
    location: "Austin, TX",
    age_range: "25-27",
    relationship_status: "Single",
    orientation: "Gay",
    profile_photo: "/demo-members/alex-m.svg",
    member_type: "individual",
    what_brought_you_here:
      "I realized I don't know who I am as a sexual being. Wanted to explore that with support.",
    connection_hoping: "To feel less alone in figuring out what I want",
    interests: ["embodiment", "dating", "community", "connection"],
    pairing_comfort_level: "New to this",
    quiz_result: "The Seeker",
    completed_onboarding: true,
    spaces_joined: ["commons", "start-here", "dating-desire", "embodiment"],
    joined_at: new Date("2026-05-10").toISOString(),
  },
  {
    id: "demo-chris-w",
    display_name: "Chris",
    pronouns: "he/him",
    location: "Seattle, WA",
    age_range: "38-41",
    relationship_status: "In a relationship",
    orientation: "Gay",
    profile_photo: "/demo-members/chris-w.svg",
    member_type: "individual",
    what_brought_you_here:
      "My partner and I opened up our relationship and needed guidance on how to do it with love.",
    connection_hoping: "To learn from other couples navigating non-traditional relationships",
    interests: ["couples work", "communication", "spirituality", "intimacy"],
    pairing_comfort_level: "Comfortable",
    quiz_result: "The Bridge Builder",
    completed_onboarding: true,
    spaces_joined: ["commons", "start-here", "couples-closeness", "spirituality-sexuality"],
    joined_at: new Date("2026-04-05").toISOString(),
  },
  {
    id: "demo-jordan-k",
    display_name: "Jordan",
    pronouns: "he/him",
    location: "Denver, CO",
    age_range: "31-34",
    relationship_status: "In a relationship",
    orientation: "Gay",
    profile_photo: "/demo-members/jordan-k.svg",
    member_type: "individual",
    what_brought_you_here:
      "My partner grew up with no safe touch. I wanted to learn how to support his healing.",
    connection_hoping: "To understand the spiritual side of physical intimacy",
    interests: ["touch", "intimacy", "embodiment", "spirituality"],
    pairing_comfort_level: "Comfortable",
    quiz_result: "The Healer",
    completed_onboarding: true,
    spaces_joined: ["commons", "start-here", "touch-and-affection", "couples-closeness"],
    joined_at: new Date("2026-04-22").toISOString(),
  },
  {
    id: "demo-david-l",
    display_name: "David",
    pronouns: "he/him",
    location: "Boston, MA",
    age_range: "45-50",
    relationship_status: "Single",
    orientation: "Gay",
    profile_photo: "/demo-members/david-l.svg",
    member_type: "individual",
    what_brought_you_here:
      "Spent 30 years hiding my feelings. Now I want to know what it means to be a whole man.",
    connection_hoping: "Other men exploring authentic masculinity",
    interests: ["masculinity", "vulnerability", "community", "spirituality"],
    pairing_comfort_level: "Learning",
    quiz_result: "The Awakening",
    completed_onboarding: true,
    spaces_joined: ["commons", "start-here", "masculinity-sexuality", "embodiment"],
    joined_at: new Date("2026-05-01").toISOString(),
  },
  {
    id: "demo-ryan-p",
    display_name: "Ryan",
    pronouns: "he/him",
    location: "Chicago, IL",
    age_range: "29-32",
    relationship_status: "Single",
    orientation: "Gay",
    profile_photo: "/demo-members/ryan-p.svg",
    member_type: "individual",
    what_brought_you_here:
      "Dating feels superficial. I want to meet men who are looking for something real.",
    connection_hoping: "Authentic relationships where we can be ourselves",
    interests: ["dating", "community", "spirituality", "fun"],
    pairing_comfort_level: "Comfortable",
    quiz_result: "The Romantic",
    completed_onboarding: true,
    spaces_joined: ["commons", "start-here", "dating-desire", "intimacy-patterns"],
    joined_at: new Date("2026-04-30").toISOString(),
  },
  {
    id: "demo-sammy-c",
    display_name: "Sammy",
    pronouns: "he/him",
    location: "New York, NY",
    age_range: "26-28",
    relationship_status: "Single",
    orientation: "Gay",
    profile_photo: "/demo-members/sammy-c.svg",
    member_type: "individual",
    what_brought_you_here:
      "I want to be a more conscious lover. This seemed like the right place to start.",
    connection_hoping: "To understand sexuality as spiritual and relational",
    interests: ["sexuality", "communication", "community", "embodiment"],
    pairing_comfort_level: "Very comfortable",
    quiz_result: "The Conscious",
    completed_onboarding: true,
    spaces_joined: ["commons", "start-here", "dating-desire", "spirituality-sexuality"],
    joined_at: new Date("2026-05-05").toISOString(),
  },
  {
    id: "demo-noah-g",
    display_name: "Noah",
    pronouns: "he/him",
    location: "Miami, FL",
    age_range: "33-36",
    relationship_status: "In a relationship",
    orientation: "Gay",
    profile_photo: "/demo-members/noah-g.svg",
    member_type: "individual",
    what_brought_you_here:
      "After 5 years together, our sex life had become predictable. We wanted to reignite things.",
    connection_hoping: "Practical advice from couples who've navigated this",
    interests: ["couples work", "intimacy", "spirituality", "sexuality"],
    pairing_comfort_level: "Comfortable",
    quiz_result: "The Harmonizer",
    completed_onboarding: true,
    spaces_joined: ["commons", "start-here", "couples-closeness", "dating-desire"],
    joined_at: new Date("2026-04-18").toISOString(),
  },
];

// Space memberships
const demoSpaceMemberships = [];
demoMembers.forEach((member) => {
  if (member.spaces_joined) {
    member.spaces_joined.forEach((spaceId) => {
      demoSpaceMemberships.push({
        user_id: member.id,
        space_id: spaceId,
        joined_at: member.joined_at,
      });
    });
  }
});

async function seedDemoMembers() {
  console.log("Starting demo members seed...\n");

  try {
    // Insert demo members
    console.log(`Inserting ${demoMembers.length} demo members...`);
    const { error: insertError } = await supabase
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
    console.log("─".repeat(50));

    const spaceCounts = {};
    demoMembers.forEach((member) => {
      if (member.spaces_joined) {
        member.spaces_joined.forEach((spaceId) => {
          spaceCounts[spaceId] = (spaceCounts[spaceId] || 0) + 1;
        });
      }
    });

    console.log("\nMembers per space:");
    Object.entries(spaceCounts).forEach(([spaceId, count]) => {
      console.log(`  ${spaceId}: ${count} members`);
    });

    console.log(`\nTotal: ${demoMembers.length} demo members`);
    console.log(`Total: ${demoSpaceMemberships.length} space memberships`);
    console.log("\n✓ Demo members seeded successfully to Supabase!");
  } catch (error) {
    console.error("Unexpected error:", error);
    process.exit(1);
  }
}

seedDemoMembers();
