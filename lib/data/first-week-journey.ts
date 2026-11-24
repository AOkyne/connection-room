// First Week Journey progress tracking
// Saved to the member's account (member_journey_progress, migration 108);
// localStorage only in demo mode or as a backup copy.

import { forgetJourneyCache, getSignedInUserId, loadJourneyState, saveJourneyField } from "@/lib/data/journey-store";

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

function parseJourney(raw: Record<string, unknown>): JourneyProgress {
  return {
    userId: String(raw.userId || ""),
    currentDoor: Number(raw.currentDoor) || 1,
    completedDoors: (raw.completedDoors as number[]) || [],
    privateReflections: (raw.privateReflections as Record<number, string>) || {},
    selectedIntention: (raw.selectedIntention as string) || undefined,
    startedAt: new Date((raw.startedAt as string) || Date.now()),
    completedAt: raw.completedAt ? new Date(raw.completedAt as string) : undefined,
    updatedAt: new Date((raw.updatedAt as string) || Date.now()),
  };
}

function readLocalJourney(): JourneyProgress | null {
  try {
    const stored = localStorage.getItem(JOURNEY_STORAGE_KEY);
    return stored ? parseJourney(JSON.parse(stored)) : null;
  } catch {
    console.warn("Error parsing journey progress from localStorage");
    return null;
  }
}

// Get user's journey progress: from the member's account when signed in
// (rescuing any copy this browser kept from before saving was fixed),
// otherwise -- demo mode, or the account can't be reached -- this browser.
export async function getJourneyProgress(): Promise<JourneyProgress | null> {
  if (typeof window === "undefined") return null;

  const userId = await getSignedInUserId();
  if (userId) {
    const remote = await loadJourneyState(userId, "first_week", JOURNEY_STORAGE_KEY);
    if (remote !== undefined) return remote ? parseJourney({ ...remote, userId }) : null;
  }
  return readLocalJourney();
}

// Save journey progress. Signed-in members' progress (and private
// reflections) goes to their account; this throws if that fails, so the
// screen can say it wasn't saved. A copy is kept in this browser as well.
export async function saveJourneyProgress(progress: JourneyProgress): Promise<void> {
  if (typeof window === "undefined") return;

  const userId = await getSignedInUserId();
  if (userId) progress.userId = userId;
  saveToLocalStorage(progress);
  if (userId) {
    forgetJourneyCache(userId, "first_week");
    await saveJourneyField(userId, "first_week", JSON.parse(JSON.stringify(progress)));
  }
}

function saveToLocalStorage(progress: JourneyProgress): void {
  try {
    localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // storage unavailable (private browsing): the account copy is what counts
  }
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
    const userId = await getSignedInUserId();
    progress = {
      userId: userId || "guest",
      currentDoor: 1,
      completedDoors: [],
      privateReflections: {},
      startedAt: new Date(),
      updatedAt: new Date(),
    };
    try {
      await saveJourneyProgress(progress);
    } catch (e) {
      // Still show the journey; the next save tries the account again.
      console.warn("Couldn't save new journey to the account:", e);
    }
  }

  return progress;
}
