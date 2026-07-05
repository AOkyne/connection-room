#!/usr/bin/env node

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// Import seed data
const seedData = require("../lib/seed/daily-companion-content.ts");

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seed...");

    // Prepare all content items
    const allContent = [];

    // Themes
    seedData.dailyThemes.forEach((item) => {
      allContent.push({
        id: `theme-${item.index}`,
        content_type: "theme",
        title: item.title,
        body: `Today's theme: ${item.title}`,
        category: item.category,
        rotation_index: item.index,
        active: true,
      });
    });

    // Reflections
    seedData.reflectionPrompts.forEach((item) => {
      allContent.push({
        id: `reflection-${item.index}`,
        content_type: "reflection",
        title: "Today's Reflection",
        body: item.prompt,
        rotation_index: item.index,
        active: true,
      });
    });

    // Practices
    seedData.embodimentPractices.forEach((item) => {
      allContent.push({
        id: `practice-${item.index}`,
        content_type: "practice",
        title: "Today's Embodiment Practice",
        body: item.practice,
        rotation_index: item.index,
        active: true,
      });
    });

    // Check-ins
    seedData.bodyCheckIns.forEach((item) => {
      allContent.push({
        id: `checkin-${item.index}`,
        content_type: "checkin",
        title: "Body Check-In",
        body: item.prompt,
        rotation_index: item.index,
        active: true,
      });
    });

    // Invitations
    seedData.conversationInvitations.forEach((item) => {
      allContent.push({
        id: `invitation-${item.index}`,
        content_type: "invitation",
        title: "Today's Conversation Invitation",
        body: item.invitation,
        rotation_index: item.index,
        active: true,
      });
    });

    // Quotes
    seedData.quotes.forEach((item) => {
      allContent.push({
        id: `quote-${item.index}`,
        content_type: "quote",
        title: "Today's Quote",
        body: `"${item.quote}" — ${item.author}`,
        rotation_index: item.index,
        active: true,
      });
    });

    console.log(`📝 Prepared ${allContent.length} content items`);

    // Clear existing content
    console.log("🗑️  Clearing existing daily_companion_content...");
    const { error: deleteError } = await supabase
      .from("daily_companion_content")
      .delete()
      .neq("id", "");

    if (deleteError) {
      console.warn("⚠️  Warning clearing existing data:", deleteError.message);
    }

    // Insert in batches (Supabase has size limits)
    const batchSize = 100;
    for (let i = 0; i < allContent.length; i += batchSize) {
      const batch = allContent.slice(i, i + batchSize);
      console.log(`📤 Inserting batch ${i / batchSize + 1}...`);

      const { error: insertError, data } = await supabase
        .from("daily_companion_content")
        .insert(batch);

      if (insertError) {
        console.error(`❌ Error inserting batch:`, insertError);
        process.exit(1);
      }

      console.log(`✓ Inserted ${batch.length} items`);
    }

    console.log("✅ Database seeding complete!");
    console.log(`📊 Total items inserted: ${allContent.length}`);

    // Verify index 75
    const { data: index75 } = await supabase
      .from("daily_companion_content")
      .select("*")
      .eq("rotation_index", 75)
      .order("content_type");

    console.log("\n📍 Verification - Index 75 content:");
    index75.forEach((item) => {
      console.log(`  • ${item.content_type}: ${item.title || item.body.substring(0, 50)}...`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedDatabase();
