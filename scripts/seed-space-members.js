#!/usr/bin/env node

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Supabase env vars required");
  process.exit(1);
}

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getSeedUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .like("display_name", "%Marcus%")
    .or("display_name.like.Daniel,display_name.like.James,display_name.like.Alex,display_name.like.Chris,display_name.like.Jordan,display_name.like.David,display_name.like.Ryan,display_name.like.Sammy,display_name.like.Noah");

  return data || [];
}

const spaceMappings = {
  "Marcus": ["commons", "start-here", "touch-and-affection", "intimacy-patterns"],
  "Daniel": ["commons", "start-here", "dating-desire", "couples-closeness"],
  "James": ["commons", "start-here", "spirituality-sexuality", "masculinity-sexuality"],
  "Alex": ["commons", "start-here", "dating-desire", "embodiment"],
  "Chris": ["commons", "start-here", "couples-closeness", "spirituality-sexuality"],
  "Jordan": ["commons", "start-here", "touch-and-affection", "couples-closeness"],
  "David": ["commons", "start-here", "masculinity-sexuality", "embodiment"],
  "Ryan": ["commons", "start-here", "dating-desire", "intimacy-patterns"],
  "Sammy": ["commons", "start-here", "dating-desire", "spirituality-sexuality"],
  "Noah": ["commons", "start-here", "couples-closeness", "dating-desire"],
};

async function seedSpaceMembers() {
  console.log("Adding demo members to spaces...\n");

  // Get all demo profiles
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("display_name", Object.keys(spaceMappings));

  if (error || !profiles) {
    console.error("Error fetching profiles:", error);
    process.exit(1);
  }

  const memberships = [];
  profiles.forEach((profile) => {
    const spaces = spaceMappings[profile.display_name];
    if (spaces) {
      spaces.forEach((spaceId) => {
        memberships.push({
          user_id: profile.id,
          space_id: spaceId,
          joined_at: new Date().toISOString(),
        });
      });
    }
  });

  console.log(`Creating ${memberships.length} space memberships...`);

  const { error: insertError } = await supabase
    .from("space_members")
    .upsert(memberships, { onConflict: "user_id,space_id" });

  if (insertError) {
    console.error("Error adding members to spaces:", insertError);
    process.exit(1);
  }

  console.log("\n✓ Demo members added to spaces!");
  
  // Print summary
  const spaceCounts = {};
  memberships.forEach((m) => {
    spaceCounts[m.space_id] = (spaceCounts[m.space_id] || 0) + 1;
  });

  console.log("\nMembers per space:");
  Object.entries(spaceCounts).forEach(([space, count]) => {
    console.log(`  ${space}: ${count} members`);
  });
}

seedSpaceMembers();
