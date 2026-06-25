import { supabase } from "@/lib/supabase/client";
import { Month } from "@/lib/types/guided-rhythm";

const CUSTOM_CONTENT_STORAGE_KEY = "connection-room:custom-rhythm-content";

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

// Save custom rhythm content
export async function saveCustomRhythmContent(
  months: Month[]
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const userId = await getCurrentUserId();

  // Try to save to Supabase if authenticated
  if (userId && supabase) {
    try {
      const { error } = await supabase.from("custom_rhythm_content").upsert({
        user_id: userId,
        content: months,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.warn("Error saving to Supabase:", error);
        saveToLocalStorage(months);
        return true;
      }
      return true;
    } catch (err) {
      console.warn("Supabase save failed, falling back to localStorage");
      saveToLocalStorage(months);
      return true;
    }
  }

  // Save to localStorage
  saveToLocalStorage(months);
  return true;
}

function saveToLocalStorage(months: Month[]): void {
  localStorage.setItem(CUSTOM_CONTENT_STORAGE_KEY, JSON.stringify(months));
}

// Load custom rhythm content
export async function loadCustomRhythmContent(): Promise<Month[] | null> {
  if (typeof window === "undefined") return null;

  const userId = await getCurrentUserId();

  // Try Supabase first if authenticated
  if (userId && supabase) {
    try {
      const { data, error } = await supabase
        .from("custom_rhythm_content")
        .select("content")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.warn("Error loading from Supabase:", error);
      }

      if (data && data.content) {
        return data.content;
      }
    } catch (err) {
      console.warn("Supabase load failed, falling back to localStorage");
    }
  }

  // Fall back to localStorage
  const stored = localStorage.getItem(CUSTOM_CONTENT_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.warn("Error parsing custom content from localStorage");
    }
  }

  return null;
}

// Reset to default content
export function clearCustomRhythmContent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CUSTOM_CONTENT_STORAGE_KEY);
}
