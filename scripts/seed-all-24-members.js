#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const allMembers = [
  // First 10 (already seeded)
  ["Marcus", "he/him", "Los Angeles, CA", "intimacy, spirituality, embodiment, community", "/demo-members/marcus-h.svg"],
  ["Daniel", "he/him", "San Francisco, CA", "sexuality, couples work, embodiment, dating", "/demo-members/daniel-r.svg"],
  ["James", "he/him", "Portland, OR", "spirituality, masculinity, community, intimacy", "/demo-members/james-t.svg"],
  ["Alex", "he/him", "Austin, TX", "embodiment, dating, community, connection", "/demo-members/alex-m.svg"],
  ["Chris", "he/him", "Seattle, WA", "couples work, communication, spirituality, intimacy", "/demo-members/chris-w.svg"],
  ["Jordan", "he/him", "Denver, CO", "touch, intimacy, embodiment, spirituality", "/demo-members/jordan-k.svg"],
  ["David", "he/him", "Boston, MA", "masculinity, vulnerability, community, spirituality", "/demo-members/david-l.svg"],
  ["Ryan", "he/him", "Chicago, IL", "dating, community, spirituality, fun", "/demo-members/ryan-p.svg"],
  ["Sammy", "he/him", "New York, NY", "sexuality, communication, community, embodiment", "/demo-members/sammy-c.svg"],
  ["Noah", "he/him", "Miami, FL", "couples work, intimacy, spirituality, sexuality", "/demo-members/noah-g.svg"],
  // Next 14 (to be added)
  ["Ethan", "he/him", "San Diego, CA", "embodiment, spirituality, community, intimacy", "/demo-members/ethan-b.svg"],
  ["Liam", "he/him", "Phoenix, AZ", "communication, spirituality, masculinity, intimacy", "/demo-members/liam-s.svg"],
  ["Mason", "he/him", "Washington, DC", "spirituality, sexuality, couples work, embodiment", "/demo-members/mason-h.svg"],
  ["Lucas", "he/him", "Nashville, TN", "identity, community, spirituality, embodiment", "/demo-members/lucas-j.svg"],
  ["Oliver", "he/him", "Portland, ME", "meaning, spirituality, masculinity, community", "/demo-members/oliver-f.svg"],
  ["Aiden", "he/him", "Salt Lake City, UT", "spirituality, faith, couples work, community", "/demo-members/aiden-n.svg"],
  ["Isaac", "he/him", "Philadelphia, PA", "sexuality, embodiment, spirituality, community", "/demo-members/isaac-b.svg"],
  ["Michael", "he/him", "Atlanta, GA", "communication, couples work, intimacy, community", "/demo-members/michael-p.svg"],
  ["William", "he/him", "Houston, TX", "sexuality, intimacy, embodiment, community", "/demo-members/william-r.svg"],
  ["Benjamin", "he/him", "Dallas, TX", "relationships, community, embodiment, spirituality", "/demo-members/benjamin-m.svg"],
  ["Jacob", "he/him", "San Antonio, TX", "spirituality, community, vulnerability, embodiment", "/demo-members/jacob-d.svg"],
  ["Henry", "he/him", "Austin, TX", "community, spirituality, embodiment, intimacy", "/demo-members/henry-c.svg"],
  ["Tyler", "he/him", "Fort Worth, TX", "intimacy, couples work, spirituality, embodiment", "/demo-members/tyler-w.svg"],
  ["Gabriel", "he/him", "Las Vegas, NV", "connection, spirituality, embodiment, community", "/demo-members/gabriel-h.svg"],
];

const spaceMappings = {
  "Marcus": ["commons", "start-here", "touch-affection", "intimacy-patterns"],
  "Daniel": ["commons", "start-here", "dating-desire", "couples"],
  "James": ["commons", "start-here", "spirituality-sexuality", "masculinity-sex-sexuality"],
  "Alex": ["commons", "start-here", "dating-desire", "embodiment"],
  "Chris": ["commons", "start-here", "couples", "spirituality-sexuality"],
  "Jordan": ["commons", "start-here", "touch-affection", "couples"],
  "David": ["commons", "start-here", "masculinity-sex-sexuality", "embodiment"],
  "Ryan": ["commons", "start-here", "dating-desire", "intimacy-patterns"],
  "Sammy": ["commons", "start-here", "dating-desire", "spirituality-sexuality"],
  "Noah": ["commons", "start-here", "couples", "dating-desire"],
  "Ethan": ["commons", "start-here", "embodiment", "touch-affection"],
  "Liam": ["commons", "start-here", "masculinity-sex-sexuality", "touch-affection"],
  "Mason": ["commons", "start-here", "spirituality-sexuality", "couples"],
  "Lucas": ["commons", "start-here", "dating-desire", "spirituality-sexuality"],
  "Oliver": ["commons", "start-here", "spirituality-sexuality", "masculinity-sex-sexuality"],
  "Aiden": ["commons", "start-here", "spirituality-sexuality", "couples"],
  "Isaac": ["commons", "start-here", "embodiment", "dating-desire"],
  "Michael": ["commons", "start-here", "couples", "touch-affection"],
  "William": ["commons", "start-here", "dating-desire", "embodiment"],
  "Benjamin": ["commons", "start-here", "dating-desire", "intimacy-patterns"],
  "Jacob": ["commons", "start-here", "touch-affection", "spirituality-sexuality"],
  "Henry": ["commons", "start-here", "dating-desire", "spirituality-sexuality"],
  "Tyler": ["commons", "start-here", "couples", "touch-affection"],
  "Gabriel": ["commons", "start-here", "touch-affection", "dating-desire"],
};

async function seedAllMembers() {
  console.log("Seeding all 24 demo members...\n");
  
  let created = 0;
  let skipped = 0;
  
  for (const [name, pronouns, location, interests, photo] of allMembers) {
    const email = `${name.toLowerCase()}@demo.community`;
    
    // Check if user already exists
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("display_name", name)
      .limit(1);
    
    if (existing && existing.length > 0) {
      console.log(`⊘ ${name} already exists`);
      skipped++;
      continue;
    }
    
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: "DemoPassword123!@",
        email_confirm: true,
      });

      if (authError) {
        console.error(`✗ ${name}:`, authError.message);
        continue;
      }

      const userId = authData.user.id;

      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: userId,
            display_name: name,
            pronouns,
            location,
            profile_photo: photo,
            interests: interests.split(", "),
            member_type: "individual",
            completed_onboarding: true,
            joined_at: new Date().toISOString(),
          },
        ]);

      if (profileError) {
        console.error(`✗ ${name} profile:`, profileError.message);
        continue;
      }

      console.log(`✓ ${name}`);
      created++;
    } catch (err) {
      console.error(`✗ ${name}:`, err.message);
    }
  }

  console.log(`\n✓ Created ${created} new members (${skipped} already existed)`);
  console.log(`\nTotal: ${created + skipped} / 24 members`);

  // Now add all to spaces
  console.log("\nAdding all members to spaces...");
  
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name");

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

  const { error: insertError } = await supabase
    .from("space_members")
    .upsert(memberships, { onConflict: "user_id,space_id" });

  if (insertError) {
    console.error("Error adding to spaces:", insertError);
    process.exit(1);
  }

  const spaceCounts = {};
  memberships.forEach((m) => {
    spaceCounts[m.space_id] = (spaceCounts[m.space_id] || 0) + 1;
  });

  console.log("\nMembers per space:");
  Object.entries(spaceCounts).forEach(([space, count]) => {
    console.log(`  ${space}: ${count} members`);
  });
  
  console.log(`\n✓ All 24 demo members seeded and assigned to spaces!`);
}

seedAllMembers();
