#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}
import {
  dailyThemes,
  reflectionPrompts,
  embodimentPractices,
  bodyCheckIns,
  conversationInvitations,
  quotes,
} from "../lib/seed/daily-companion-content";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seed...");

    const allContent: any[] = [];

    // Themes
    dailyThemes.forEach((item) => {
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
    reflectionPrompts.forEach((item) => {
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
    embodimentPractices.forEach((item) => {
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
    bodyCheckIns.forEach((item) => {
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
    conversationInvitations.forEach((item) => {
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
    quotes.forEach((item) => {
      allContent.push({
        id: `quote-${item.index}`,
        content_type: "quote",
        title: "Today's Quote",
        body: item.quote,
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

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < allContent.length; i += batchSize) {
      const batch = allContent.slice(i, i + batchSize);
      console.log(`📤 Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allContent.length / batchSize)}...`);

      const { error: insertError } = await supabase
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
    if (index75) {
      index75.forEach((item: any) => {
        console.log(
          `  • ${item.content_type}: ${(item.title || item.body).substring(0, 60)}...`
        );
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedDatabase();
