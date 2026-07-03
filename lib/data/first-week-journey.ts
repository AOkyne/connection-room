// First Week Journey progress tracking
// Works with both localStorage (demo) and Supabase (authenticated)

import { supabase } from "@/lib/supabase/client";

export interface JourneyProgress {
  userId: string;
  currentDoor: number;
  completedDoors: number[];
  privateReflections: Record<number, string>;
  selectedIntention?: string;
  startedAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}

const JOURNEY_STORAGE_KEY = "connection-room:journey-progress";

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

// Initialize journey for new user
export function initializeJourney(): JourneyProgress {
  return {
    userId: "",
    currentDoor: 1,
    completedDoors: [],
    privateReflections: {},
    startedAt: new Date(),
    updatedAt: new Date(),
  };
}

// Get user's journey progress
export async function getJourneyProgress(): Promise<JourneyProgress | null> {
  if (typeof window === "undefined") return null;

  const userId = await getCurrentUserId();

  // Try Supabase first if authenticated
  if (userId && supabase) {
    try {
      const { data, error } = await supabase
        .from("first_week_journey_progress")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.warn("Error fetching journey progress from Supabase:", error);
      }

      if (data && data.length > 0) {
        const journeyData = data[0];
        return {
          userId: journeyData.user_id,
          currentDoor: journeyData.current_door || 1,
          completedDoors: journeyData.completed_doors || [],
          privateReflections: journeyData.private_reflections || {},
          selectedIntention: journeyData.selected_intention,
          startedAt: new Date(journeyData.started_at),
          completedAt: journeyData.completed_at ? new Date(journeyData.completed_at) : undefined,
          updatedAt: new Date(journeyData.updated_at),
        };
      }
    } catch (err) {
      console.warn("Supabase journey fetch failed, falling back to localStorage");
    }
  }

  // Fall back to localStorage
  const stored = localStorage.getItem(JOURNEY_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        startedAt: new Date(parsed.startedAt),
        completedAt: parsed.completedAt ? new Date(parsed.completedAt) : undefined,
        updatedAt: new Date(parsed.updatedAt),
      };
    } catch (e) {
      console.warn("Error parsing journey progress from localStorage");
    }
  }

  // Return null if no progress found
  return null;
}

// Save journey progress
export async function saveJourneyProgress(progress: JourneyProgress): Promise<void> {
  if (typeof window === "undefined") return;

  const userId = await getCurrentUserId();

  // Try to save to Supabase if authenticated
  if (userId && supabase) {
    try {
      const { error } = await supabase
        .from("first_week_journey_progress")
        .upsert({
          user_id: userId,
          current_door: progress.currentDoor,
          completed_doors: progress.completedDoors,
          private_reflections: progress.privateReflections,
          selected_intention: progress.selectedIntention,
          started_at: progress.startedAt.toISOString(),
          completed_at: progress.completedAt?.toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.warn("Error saving journey to Supabase:", error);
        // Fall back to localStorage
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

function saveToLocalStorage(progress: JourneyProgress): void {
  localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(progress));
}

// Mark a door as completed
export async function completeDoor(doorNumber: number): Promise<JourneyProgress | null> {
  const progress = await getJourneyProgress();
  if (!progress) return null;

  if (!progress.completedDoors.includes(doorNumber)) {
    progress.completedDoors.push(doorNumber);
    progress.completedDoors.sort((a, b) => a - b);
  }

  // Update current door
  if (doorNumber === 7) {
    progress.completedAt = new Date();
  } else {
    progress.currentDoor = Math.min(doorNumber + 1, 7);
  }

  progress.updatedAt = new Date();
  await saveJourneyProgress(progress);

  return progress;
}

// Save private reflection for a door
export async function savePrivateReflection(
  doorNumber: number,
  reflection: string
): Promise<JourneyProgress | null> {
  const progress = await getJourneyProgress();
  if (!progress) return null;

  progress.privateReflections[doorNumber] = reflection;
  progress.updatedAt = new Date();
  await saveJourneyProgress(progress);

  return progress;
}

// Get private reflection for a door
export async function getPrivateReflection(doorNumber: number): Promise<string | null> {
  const progress = await getJourneyProgress();
  if (!progress) return null;

  return progress.privateReflections[doorNumber] || null;
}

// Set first month intention
export async function setFirstMonthIntention(intention: string): Promise<JourneyProgress | null> {
  const progress = await getJourneyProgress();
  if (!progress) return null;

  progress.selectedIntention = intention;
  progress.updatedAt = new Date();
  await saveJourneyProgress(progress);

  return progress;
}

// Check if journey is complete
export async function isJourneyComplete(): Promise<boolean> {
  const progress = await getJourneyProgress();
  if (!progress) return false;

  return progress.completedDoors.length === 7 && !!progress.completedAt;
}

// Get journey completion percentage
export async function getJourneyProgress_Percentage(): Promise<number> {
  const progress = await getJourneyProgress();
  if (!progress) return 0;

  return Math.round((progress.completedDoors.length / 7) * 100);
}

// Create initial journey entry if it doesn't exist
export async function ensureJourneyExists(): Promise<JourneyProgress> {
  let progress = await getJourneyProgress();

  if (!progress) {
    const userId = await getCurrentUserId();
    progress = {
      userId: userId || "guest",
      currentDoor: 1,
      completedDoors: [],
      privateReflections: {},
      startedAt: new Date(),
      updatedAt: new Date(),
    };
    await saveJourneyProgress(progress);
  }

  return progress;
}
