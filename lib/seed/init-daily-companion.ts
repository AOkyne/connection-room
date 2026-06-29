/**
 * Initialize Daily Companion Content
 *
 * This runs on app startup to seed the database with daily companion content
 * if it hasn't been seeded yet. Can be triggered manually via admin interface.
 */

import { supabase } from "@/lib/supabase/client";
import { seedDailyCompanionContent } from "@/lib/data/daily-companion";

let initialized = false;

/**
 * Check if content is already seeded (by checking if any content exists)
 */
async function isContentSeeded(): Promise<boolean> {
  if (!supabase) return true; // Demo mode, consider seeded

  try {
    const { count } = await supabase
      .from("daily_companion_content")
      .select("*", { count: "exact", head: true });

    return (count ?? 0) > 0;
  } catch (error) {
    console.warn("Error checking if content is seeded:", error);
    return false;
  }
}

/**
 * Initialize daily companion content if needed
 * Call this once on app startup
 */
export async function initializeDailyCompanion(): Promise<boolean> {
  if (initialized) return true;

  try {
    const seeded = await isContentSeeded();

    if (!seeded) {
      console.log("Seeding daily companion content...");
      const success = await seedDailyCompanionContent();
      if (success) {
        console.log("Daily companion content seeded successfully");
      } else {
        console.warn("Failed to seed daily companion content");
        return false;
      }
    }

    initialized = true;
    return true;
  } catch (error) {
    console.warn("Error initializing daily companion:", error);
    return false;
  }
}
