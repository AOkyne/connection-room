import { supabase } from "@/lib/supabase/client";
import {
  dailyThemes,
  reflectionPrompts,
  embodimentPractices,
  bodyCheckIns,
  conversationInvitations,
  quotes,
  weeklyTrevorNotes,
} from "@/lib/seed/daily-companion-content";

export interface DailyContent {
  id: string;
  content_type: "theme" | "reflection" | "practice" | "checkin" | "invitation" | "quote";
  title: string;
  body: string;
  category?: string;
  intended_date?: string;
  rotation_index: number;
  active: boolean;
  created_at: string;
}

export interface WeeklyNote {
  id: string;
  week_number: number;
  title: string;
  body: string;
  related_prompt_id?: string;
  related_space_id?: string;
  intended_date?: string;
  rotation_index: number;
  active: boolean;
  created_at: string;
}

export interface UserReflection {
  id: string;
  user_id: string;
  content_id: string;
  prompt_text: string;
  response: string;
  privacy_setting: "private" | "shared";
  created_at: string;
  updated_at: string;
}

// Get days since app launch (fallback for rotation)
export function getDaysSinceLaunch(): number {
  const launchDate = new Date("2024-01-01"); // App launch date
  const now = new Date();
  const diff = now.getTime() - launchDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getWeekSinceLaunch(): number {
  return Math.floor(getDaysSinceLaunch() / 7);
}

/**
 * Get today's daily companion content
 * Uses rotation_index based on days since launch
 */
export async function getTodaysDailyContent(): Promise<{
  theme: DailyContent | null;
  reflection: DailyContent | null;
  practice: DailyContent | null;
  checkin: DailyContent | null;
  invitation: DailyContent | null;
  quote: DailyContent | null;
}> {
  if (!supabase) {
    // Demo mode: use seed data with rotation
    const dayIndex = getDaysSinceLaunch() % 120;
    return {
      theme: dailyThemes[dayIndex]
        ? {
            id: `theme-${dayIndex}`,
            content_type: "theme",
            title: dailyThemes[dayIndex].title,
            body: `Today's theme: ${dailyThemes[dayIndex].title}`,
            category: dailyThemes[dayIndex].category,
            rotation_index: dayIndex,
            active: true,
            created_at: new Date().toISOString(),
          }
        : null,
      reflection: reflectionPrompts[dayIndex]
        ? {
            id: `reflection-${dayIndex}`,
            content_type: "reflection",
            title: "Today's Reflection",
            body: reflectionPrompts[dayIndex].prompt,
            rotation_index: dayIndex,
            active: true,
            created_at: new Date().toISOString(),
          }
        : null,
      practice: embodimentPractices[dayIndex]
        ? {
            id: `practice-${dayIndex}`,
            content_type: "practice",
            title: "Today's Embodiment Practice",
            body: embodimentPractices[dayIndex].practice,
            rotation_index: dayIndex,
            active: true,
            created_at: new Date().toISOString(),
          }
        : null,
      checkin: bodyCheckIns[dayIndex]
        ? {
            id: `checkin-${dayIndex}`,
            content_type: "checkin",
            title: "Body Check-In",
            body: bodyCheckIns[dayIndex].prompt,
            rotation_index: dayIndex,
            active: true,
            created_at: new Date().toISOString(),
          }
        : null,
      invitation: conversationInvitations[dayIndex]
        ? {
            id: `invitation-${dayIndex}`,
            content_type: "invitation",
            title: "Today's Conversation Invitation",
            body: conversationInvitations[dayIndex].invitation,
            rotation_index: dayIndex,
            active: true,
            created_at: new Date().toISOString(),
          }
        : null,
      quote: quotes[dayIndex]
        ? {
            id: `quote-${dayIndex}`,
            content_type: "quote",
            title: "Today's Quote",
            body: quotes[dayIndex].quote,
            rotation_index: dayIndex,
            active: true,
            created_at: new Date().toISOString(),
          }
        : null,
    };
  }

  const dayIndex = getDaysSinceLaunch() % 120;

  try {
    const { data, error } = await supabase
      .from("daily_companion_content")
      .select("*")
      .eq("active", true)
      .eq("rotation_index", dayIndex)
      .order("content_type");

    if (error) {
      console.warn("Error fetching daily content:", error);
      // Fallback to seed data
      return getTodaysDailyContent();
    }

    // Organize by content_type
    const content: Record<string, DailyContent | null> = {
      theme: null,
      reflection: null,
      practice: null,
      checkin: null,
      invitation: null,
      quote: null,
    };

    data?.forEach((item) => {
      content[item.content_type] = item;
    });

    return {
      theme: content.theme as DailyContent,
      reflection: content.reflection as DailyContent,
      practice: content.practice as DailyContent,
      checkin: content.checkin as DailyContent,
      invitation: content.invitation as DailyContent,
      quote: content.quote as DailyContent,
    };
  } catch (error) {
    console.warn("Error fetching daily content:", error);
    // Fallback to seed data
    return getTodaysDailyContent();
  }
}

/**
 * Get this week's Trevor note
 */
export async function getTrevorWeeklyNote(): Promise<WeeklyNote | null> {
  if (!supabase) {
    // Demo mode: use seed data
    const weekIndex = getWeekSinceLaunch() % 16;
    const note = weeklyTrevorNotes[weekIndex];
    if (!note) return null;

    return {
      id: `weekly-${weekIndex}`,
      week_number: note.week,
      title: note.title,
      body: note.body,
      related_prompt_id: note.prompt_snapshot ? `reflection-${weekIndex * 7}` : undefined,
      related_space_id: note.space_suggestion,
      rotation_index: weekIndex,
      active: true,
      created_at: new Date().toISOString(),
    };
  }

  const weekIndex = getWeekSinceLaunch() % 16;

  try {
    const { data, error } = await supabase
      .from("weekly_notes")
      .select("*")
      .eq("active", true)
      .eq("rotation_index", weekIndex)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      console.warn("Error fetching weekly note:", error);
    }

    return data || null;
  } catch (error) {
    console.warn("Error fetching weekly note:", error);
    return null;
  }
}

/**
 * Save a user reflection
 */
export async function saveUserReflection(
  userId: string,
  contentId: string,
  promptText: string,
  response: string
): Promise<UserReflection | null> {
  if (!supabase) {
    // Demo mode: use localStorage
    const reflections = JSON.parse(localStorage.getItem("demo-reflections") || "{}");
    const id = `demo-reflection-${Date.now()}`;
    const reflection: UserReflection = {
      id,
      user_id: userId,
      content_id: contentId,
      prompt_text: promptText,
      response,
      privacy_setting: "private",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    reflections[id] = reflection;
    localStorage.setItem("demo-reflections", JSON.stringify(reflections));
    return reflection;
  }

  try {
    const { data, error } = await supabase
      .from("user_reflections")
      .insert({
        user_id: userId,
        content_id: contentId,
        prompt_text: promptText,
        response,
        privacy_setting: "private" as const,
      })
      .select()
      .single();

    if (error) {
      console.warn("Error saving reflection:", error);
      return null;
    }

    return data as UserReflection;
  } catch (error) {
    console.warn("Error saving reflection:", error);
    return null;
  }
}

/**
 * Get user's reflections (with pagination)
 */
export async function getUserReflections(
  userId: string,
  limit: number = 10
): Promise<UserReflection[]> {
  if (!supabase) {
    // Demo mode: use localStorage
    const reflections = JSON.parse(localStorage.getItem("demo-reflections") || "{}");
    return Object.values(reflections)
      .filter((r: any) => r.user_id === userId)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit) as UserReflection[];
  }

  try {
    const { data, error } = await supabase
      .from("user_reflections")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("Error fetching reflections:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn("Error fetching reflections:", error);
    return [];
  }
}

/**
 * Update a user reflection
 */
export async function updateUserReflection(
  reflectionId: string,
  response: string
): Promise<UserReflection | null> {
  if (!supabase) {
    // Demo mode: use localStorage
    const reflections = JSON.parse(localStorage.getItem("demo-reflections") || "{}");
    if (reflections[reflectionId]) {
      reflections[reflectionId].response = response;
      reflections[reflectionId].updated_at = new Date().toISOString();
      localStorage.setItem("demo-reflections", JSON.stringify(reflections));
      return reflections[reflectionId];
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("user_reflections")
      .update({ response, updated_at: new Date().toISOString() })
      .eq("id", reflectionId)
      .select()
      .single();

    if (error) {
      console.warn("Error updating reflection:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.warn("Error updating reflection:", error);
    return null;
  }
}

/**
 * Delete a user reflection
 */
export async function deleteUserReflection(reflectionId: string): Promise<boolean> {
  if (!supabase) {
    // Demo mode: use localStorage
    const reflections = JSON.parse(localStorage.getItem("demo-reflections") || "{}");
    delete reflections[reflectionId];
    localStorage.setItem("demo-reflections", JSON.stringify(reflections));
    return true;
  }

  try {
    const { error } = await supabase.from("user_reflections").delete().eq("id", reflectionId);

    if (error) {
      console.warn("Error deleting reflection:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Error deleting reflection:", error);
    return false;
  }
}

/**
 * Seed daily companion content to Supabase
 * Should be called once during initial setup
 */
export async function seedDailyCompanionContent(): Promise<boolean> {
  if (!supabase) {
    console.log("Demo mode: skipping database seed");
    return true;
  }

  try {
    // Seed daily themes
    const themeData = dailyThemes.map((theme, idx) => ({
      content_type: "theme",
      title: theme.title,
      body: `Theme: ${theme.title}`,
      category: theme.category,
      rotation_index: theme.index,
      active: true,
    }));

    // Seed reflections
    const reflectionData = reflectionPrompts.map((prompt, idx) => ({
      content_type: "reflection",
      title: "Daily Reflection",
      body: prompt.prompt,
      rotation_index: prompt.index,
      active: true,
    }));

    // Seed practices
    const practiceData = embodimentPractices.map((practice, idx) => ({
      content_type: "practice",
      title: "Embodiment Practice",
      body: practice.practice,
      rotation_index: practice.index,
      active: true,
    }));

    // Seed check-ins
    const checkinData = bodyCheckIns.map((checkin, idx) => ({
      content_type: "checkin",
      title: "Body Check-In",
      body: checkin.prompt,
      rotation_index: checkin.index,
      active: true,
    }));

    // Seed invitations
    const invitationData = conversationInvitations.map((inv, idx) => ({
      content_type: "invitation",
      title: "Conversation Invitation",
      body: inv.invitation,
      rotation_index: inv.index,
      active: true,
    }));

    // Seed quotes
    const quoteData = quotes.map((quote, idx) => ({
      content_type: "quote",
      title: "Daily Quote",
      body: quote.quote,
      rotation_index: quote.index,
      active: true,
    }));

    const allContent = [
      ...themeData,
      ...reflectionData,
      ...practiceData,
      ...checkinData,
      ...invitationData,
      ...quoteData,
    ];

    // Insert in batches to avoid timeout
    const batchSize = 50;
    for (let i = 0; i < allContent.length; i += batchSize) {
      const batch = allContent.slice(i, i + batchSize);
      const { error } = await supabase.from("daily_companion_content").insert(batch);

      if (error) {
        console.warn(`Error seeding batch ${i / batchSize}:`, error);
      }
    }

    // Seed weekly notes
    const weeklyData = weeklyTrevorNotes.map((note, idx) => ({
      week_number: note.week,
      title: note.title,
      body: note.body,
      related_space_id: note.space_suggestion,
      rotation_index: note.week - 1,
      active: true,
    }));

    const { error: weekError } = await supabase.from("weekly_notes").insert(weeklyData);

    if (weekError) {
      console.warn("Error seeding weekly notes:", weekError);
    }

    console.log("Daily companion content seeded successfully");
    return true;
  } catch (error) {
    console.warn("Error seeding daily companion content:", error);
    return false;
  }
}
