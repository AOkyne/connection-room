#!/usr/bin/env node

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function nameToUUID(name) {
  const hash = crypto.createHash("md5").update(name).digest("hex");
  return [
    hash.substr(0, 8),
    hash.substr(8, 4),
    "4" + hash.substr(12, 3),
    ((parseInt(hash.substr(15, 2), 16) & 0x3f) | 0x80).toString(16) + hash.substr(17, 2),
    hash.substr(19, 12),
  ].join("-");
}

const memberData = [
  ["demo-marcus-h", "Marcus", "he/him", "Los Angeles, CA", "/demo-members/marcus-h.svg"],
  ["demo-daniel-r", "Daniel", "he/him", "San Francisco, CA", "/demo-members/daniel-r.svg"],
  ["demo-james-t", "James", "he/him", "Portland, OR", "/demo-members/james-t.svg"],
  ["demo-alex-m", "Alex", "he/him", "Austin, TX", "/demo-members/alex-m.svg"],
  ["demo-chris-w", "Chris", "he/him", "Seattle, WA", "/demo-members/chris-w.svg"],
  ["demo-jordan-k", "Jordan", "he/him", "Denver, CO", "/demo-members/jordan-k.svg"],
  ["demo-david-l", "David", "he/him", "Boston, MA", "/demo-members/david-l.svg"],
  ["demo-ryan-p", "Ryan", "he/him", "Chicago, IL", "/demo-members/ryan-p.svg"],
  ["demo-sammy-c", "Sammy", "he/him", "New York, NY", "/demo-members/sammy-c.svg"],
  ["demo-noah-g", "Noah", "he/him", "Miami, FL", "/demo-members/noah-g.svg"],
];

async function seedMembers() {
  console.log("Starting demo members seed...\n");
  console.log(`Inserting ${memberData.length} demo members with auth users...\n`);

  let inserted = 0;
  for (const [key, name, pronouns, location, photo] of memberData) {
    const userId = nameToUUID(key);
    const email = `${key}@demo.connection-room.local`;

    try {
      // Try to create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: "DemoPass123!",
        email_confirm: true,
        user_metadata: {
          display_name: name,
          is_demo_profile: true,
        },
      });

      if (authError && authError.message.includes("User already exists")) {
        console.log(`⊘ User ${name} already exists, creating profile...`);
      } else if (authError) {
        console.error(`✗ Error creating auth user for ${name}:`, authError.message);
        continue;
      } else {
        console.log(`✓ Created auth user for ${name}`);
      }

      // Now insert profile using the userId (either from auth response or from email)
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: userId,
            display_name: name,
            pronouns,
            location,
            profile_photo: photo,
            member_type: "individual",
            completed_onboarding: true,
            joined_at: new Date().toISOString(),
          },
        ])
        .select();

      if (profileError) {
        // If profile already exists, try upsert instead
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert([
            {
              id: userId,
              display_name: name,
              pronouns,
              location,
              profile_photo: photo,
              member_type: "individual",
              completed_onboarding: true,
              joined_at: new Date().toISOString(),
            },
          ]);

        if (upsertError) {
          console.error(`✗ Error creating profile for ${name}:`, upsertError.message);
          continue;
        }
      }

      console.log(`✓ Created profile for ${name}`);
      inserted++;
    } catch (err) {
      console.error(`✗ Unexpected error for ${name}:`, err.message);
    }
  }

  console.log(`\n✓ Seeding complete! Inserted ${inserted}/${memberData.length} members`);
}

seedMembers();
