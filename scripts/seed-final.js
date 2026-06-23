#!/usr/bin/env node

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const memberData = [
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
];

async function seedMembers() {
  console.log("Seeding demo members to Supabase...\n");
  
  let inserted = 0;
  
  for (const [name, pronouns, location, interests, photo] of memberData) {
    const email = `${name.toLowerCase().replace(/\\s+/g, ".")}@demo.community`;
    
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: "DemoPassword123!@",
        email_confirm: true,
      });

      if (authError) {
        console.error(`✗ Error creating user ${name}:`, authError.message);
        continue;
      }

      const userId = authData.user.id;

      // Create profile using the actual user ID from auth
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
        console.error(`✗ Error creating profile for ${name}:`, profileError.message);
        continue;
      }

      console.log(`✓ ${name} - User ID: ${userId.substring(0, 8)}...`);
      inserted++;
    } catch (err) {
      console.error(`✗ Unexpected error for ${name}:`, err.message);
    }
  }

  console.log(`\n✓ Successfully seeded ${inserted} demo members!`);
  console.log("\nNote: Demo members can log in with their email addresses.");
  console.log("Next steps:");
  console.log("1. Add these members to spaces using space_members table");
  console.log("2. Apply RLS policies from docs/RLS_POLICIES.md");
  console.log("3. Integrate member components into space pages");
}

seedMembers();
