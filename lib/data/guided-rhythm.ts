import { forgetJourneyCache, getSignedInUserId, loadJourneyState, saveJourneyField } from "@/lib/data/journey-store";
import { GuidedRhythmProgress, Month } from "@/lib/types/guided-rhythm";
import { guidedRhythm } from "@/lib/content/guided-rhythm";

const GUIDED_RHYTHM_STORAGE_KEY = "connection-room:guided-rhythm";

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

function parseRhythm(raw: Record<string, unknown>): GuidedRhythmProgress {
  const { month, week } = getCurrentMonthAndWeek();
  return {
    userId: String(raw.userId || ""),
    currentMonth: month,
    currentWeek: week,
    privateReflections: (raw.privateReflections as Record<string, string>) || {},
    monthlyIntegrations: (raw.monthlyIntegrations as Record<number, string>) || {},
    monthlyIntentions: (raw.monthlyIntentions as Record<number, string>) || {},
    startedAt: new Date((raw.startedAt as string) || Date.now()),
    updatedAt: new Date((raw.updatedAt as string) || Date.now()),
  };
}

function readLocalRhythm(): GuidedRhythmProgress | null {
  try {
    const stored = localStorage.getItem(GUIDED_RHYTHM_STORAGE_KEY);
    return stored ? parseRhythm(JSON.parse(stored)) : null;
  } catch {
    console.warn("Error parsing guided rhythm from localStorage");
    return null;
  }
}

// Get user's guided rhythm progress: from the member's account when signed
// in (rescuing any copy this browser kept from before saving was fixed),
// otherwise -- demo mode, or the account can't be reached -- this browser.
export async function getGuidedRhythmProgress(): Promise<GuidedRhythmProgress | null> {
  if (typeof window === "undefined") return null;

  const userId = await getSignedInUserId();
  if (userId) {
    const remote = await loadJourneyState(userId, "guided_rhythm", GUIDED_RHYTHM_STORAGE_KEY);
    if (remote !== undefined) return remote ? parseRhythm({ ...remote, userId }) : null;
  }
  return readLocalRhythm();
}

// Save guided rhythm progress. Signed-in members' reflections go to their
// account; this throws if that fails, so the screen can say it wasn't saved.
// A copy is kept in this browser as well.
export async function saveGuidedRhythmProgress(
  progress: GuidedRhythmProgress
): Promise<void> {
  if (typeof window === "undefined") return;

  const userId = await getSignedInUserId();
  const { month, week } = getCurrentMonthAndWeek();
  progress.currentMonth = month;
  progress.currentWeek = week;
  progress.updatedAt = new Date();
  if (userId) progress.userId = userId;

  saveToLocalStorage(progress);
  if (userId) {
    forgetJourneyCache(userId, "guided_rhythm");
    await saveJourneyField(userId, "guided_rhythm", JSON.parse(JSON.stringify(progress)));
  }
}

function saveToLocalStorage(progress: GuidedRhythmProgress): void {
  try {
    localStorage.setItem(GUIDED_RHYTHM_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // storage unavailable (private browsing): the account copy is what counts
  }
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
    const userId = await getSignedInUserId();
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
    try {
      await saveGuidedRhythmProgress(progress);
    } catch (e) {
      // Still show the rhythm; the next save tries the account again.
      console.warn("Couldn't save new rhythm to the account:", e);
    }
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
