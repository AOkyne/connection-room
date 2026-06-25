import { supabase } from "@/lib/supabase/client";
import { GuidedRhythmProgress, Month } from "@/lib/types/guided-rhythm";
import { guidedRhythm } from "@/lib/content/guided-rhythm";

const GUIDED_RHYTHM_STORAGE_KEY = "connection-room:guided-rhythm";

// Get current authenticated user ID
async function getCurrentUserId(): Promise<string | null> {
  if (typeof window === "undefined" || !supabase) return null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (err) {
    return null;
  }
}

// Calculate current month and week based on calendar
export function getCurrentMonthAndWeek(): { month: number; week: number } {
  const now = new Date();
  // Beta: June maps to Month 1, then cycles through 1-6
  const month = (((now.getMonth() - 5) % 6) + 1) as number;
  const weekOfMonth = Math.ceil(now.getDate() / 7) as number; // Week 1-4
  return {
    month: Math.min(month, 6),
    week: Math.min(weekOfMonth, 4),
  };
}

// Initialize guided rhythm for new user
export function initializeGuidedRhythm(): GuidedRhythmProgress {
  const { month, week } = getCurrentMonthAndWeek();
  return {
    userId: "",
    currentMonth: month,
    currentWeek: week,
    privateReflections: {},
    monthlyIntegrations: {},
    monthlyIntentions: {},
    startedAt: new Date(),
    updatedAt: new Date(),
  };
}

// Get user's guided rhythm progress
export async function getGuidedRhythmProgress(): Promise<GuidedRhythmProgress | null> {
  if (typeof window === "undefined") return null;

  const userId = await getCurrentUserId();
  const { month, week } = getCurrentMonthAndWeek();

  // Try Supabase first if authenticated
  if (userId && supabase) {
    try {
      const { data, error } = await supabase
        .from("guided_rhythm_progress")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.warn("Error fetching guided rhythm from Supabase:", error);
      }

      if (data) {
        return {
          userId: data.user_id,
          currentMonth: month,
          currentWeek: week,
          privateReflections: data.private_reflections || {},
          monthlyIntegrations: data.monthly_integrations || {},
          monthlyIntentions: data.monthly_intentions || {},
          startedAt: new Date(data.started_at),
          updatedAt: new Date(data.updated_at),
        };
      }
    } catch (err) {
      console.warn("Supabase guided rhythm fetch failed, falling back to localStorage");
    }
  }

  // Fall back to localStorage
  const stored = localStorage.getItem(GUIDED_RHYTHM_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        currentMonth: month,
        currentWeek: week,
        startedAt: new Date(parsed.startedAt),
        updatedAt: new Date(parsed.updatedAt),
      };
    } catch (e) {
      console.warn("Error parsing guided rhythm from localStorage");
    }
  }

  return null;
}

// Save guided rhythm progress
export async function saveGuidedRhythmProgress(
  progress: GuidedRhythmProgress
): Promise<void> {
  if (typeof window === "undefined") return;

  const userId = await getCurrentUserId();
  const { month, week } = getCurrentMonthAndWeek();

  // Update to current month/week
  progress.currentMonth = month;
  progress.currentWeek = week;
  progress.updatedAt = new Date();

  // Try to save to Supabase if authenticated
  if (userId && supabase) {
    try {
      const { error } = await supabase
        .from("guided_rhythm_progress")
        .upsert({
          user_id: userId,
          current_month: progress.currentMonth,
          current_week: progress.currentWeek,
          private_reflections: progress.privateReflections,
          monthly_integrations: progress.monthlyIntegrations,
          monthly_intentions: progress.monthlyIntentions,
          started_at: progress.startedAt.toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.warn("Error saving guided rhythm to Supabase:", error);
        saveToLocalStorage(progress);
      }
      return;
    } catch (err) {
      console.warn("Supabase save failed, falling back to localStorage");
      saveToLocalStorage(progress);
      return;
    }
  }

  // Save to localStorage
  saveToLocalStorage(progress);
}

function saveToLocalStorage(progress: GuidedRhythmProgress): void {
  localStorage.setItem(GUIDED_RHYTHM_STORAGE_KEY, JSON.stringify(progress));
}

// Save private reflection for a specific week
export async function savePrivateReflection(
  month: number,
  week: number,
  reflection: string
): Promise<void> {
  const progress = await getGuidedRhythmProgress();
  if (!progress) return;

  const key = `m${month}w${week}`;
  progress.privateReflections[key] = reflection;
  await saveGuidedRhythmProgress(progress);
}

// Get private reflection for a specific week
export async function getPrivateReflection(
  month: number,
  week: number
): Promise<string | null> {
  const progress = await getGuidedRhythmProgress();
  if (!progress) return null;

  const key = `m${month}w${week}`;
  return progress.privateReflections[key] || null;
}

// Save monthly integration reflection
export async function saveMonthlyIntegration(
  month: number,
  reflection: string
): Promise<void> {
  const progress = await getGuidedRhythmProgress();
  if (!progress) return;

  progress.monthlyIntegrations[month] = reflection;
  await saveGuidedRhythmProgress(progress);
}

// Get monthly integration reflection
export async function getMonthlyIntegration(
  month: number
): Promise<string | null> {
  const progress = await getGuidedRhythmProgress();
  if (!progress) return null;

  return progress.monthlyIntegrations[month] || null;
}

// Set monthly intention
export async function setMonthlyIntention(
  month: number,
  intention: string
): Promise<void> {
  const progress = await getGuidedRhythmProgress();
  if (!progress) return;

  progress.monthlyIntentions[month] = intention;
  await saveGuidedRhythmProgress(progress);
}

// Get monthly intention
export async function getMonthlyIntention(month: number): Promise<string | null> {
  const progress = await getGuidedRhythmProgress();
  if (!progress) return null;

  return progress.monthlyIntentions[month] || null;
}

// Ensure guided rhythm exists
export async function ensureGuidedRhythmExists(): Promise<GuidedRhythmProgress> {
  let progress = await getGuidedRhythmProgress();

  if (!progress) {
    const userId = await getCurrentUserId();
    progress = {
      userId: userId || "guest",
      currentMonth: 1,
      currentWeek: 1,
      privateReflections: {},
      monthlyIntegrations: {},
      monthlyIntentions: {},
      startedAt: new Date(),
      updatedAt: new Date(),
    };
    await saveGuidedRhythmProgress(progress);
  }

  return progress;
}

// Get rhythm content (custom or default)
export async function getRhythmContent(): Promise<Month[]> {
  if (typeof window === "undefined") return guidedRhythm;

  // Try to load custom content first
  const customStored = localStorage.getItem("connection-room:custom-rhythm-content");
  if (customStored) {
    try {
      const custom = JSON.parse(customStored);
      // Merge in nextSteps from default content if missing
      return custom.map((month: Month, idx: number) => ({
        ...month,
        integration: {
          ...month.integration,
          nextSteps: month.integration?.nextSteps || guidedRhythm[idx]?.integration?.nextSteps,
        },
      }));
    } catch (e) {
      console.warn("Error parsing custom content, using default");
    }
  }

  // Fall back to default
  return guidedRhythm;
}
