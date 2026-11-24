// Account storage for My Journey: the First Week doors and the Guided Rhythm,
// including members' private reflections and intentions (migration 108,
// member_journey_progress, readable only by the member who wrote it).
//
// Until 108 these saves failed silently and the data lived only in the
// browser's localStorage. loadJourneyState() rescues that copy into the
// account the next time the member visits on that device, but only when it
// was written by the same signed-in member (localStorage isn't per-account,
// so a shared device must never hand one member's reflections to another).

import { supabase } from "@/lib/supabase/client";

export type JourneyField = "first_week" | "guided_rhythm";

// Fields that hold a member's own writing, keyed by door / week / month.
export const REFLECTION_MAPS = {
  first_week: ["privateReflections"],
  guided_rhythm: ["privateReflections", "monthlyIntegrations", "monthlyIntentions"],
} as const;

type Json = Record<string, unknown>;

export async function getSignedInUserId(): Promise<string | null> {
  if (typeof window === "undefined" || !supabase) return null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Combine the account copy with a copy found in this browser. The account
 * wins wherever both have something; anything only in the browser is added.
 * Returns the merged value and whether the browser copy added anything.
 */
export function mergeJourney(field: JourneyField, remote: Json | null, local: Json): { merged: Json; changed: boolean } {
  if (!remote) return { merged: local, changed: true };
  const merged: Json = { ...remote };
  let changed = false;
  for (const key of REFLECTION_MAPS[field]) {
    const r = (remote[key] as Record<string, string>) || {};
    const l = (local[key] as Record<string, string>) || {};
    const out = { ...r };
    for (const [k, v] of Object.entries(l)) {
      if (typeof v === "string" && v.trim() && !(typeof r[k] === "string" && r[k].trim())) {
        out[k] = v;
        changed = true;
      }
    }
    merged[key] = out;
  }
  if (field === "first_week") {
    const rd = (remote.completedDoors as number[]) || [];
    const ld = (local.completedDoors as number[]) || [];
    const doors = [...new Set([...rd, ...ld])].sort((a, b) => a - b);
    if (doors.length !== rd.length) changed = true;
    merged.completedDoors = doors;
    merged.currentDoor = Math.max(Number(remote.currentDoor) || 1, Number(local.currentDoor) || 1);
    if (!remote.selectedIntention && local.selectedIntention) {
      merged.selectedIntention = local.selectedIntention;
      changed = true;
    }
    if (!remote.completedAt && local.completedAt) merged.completedAt = local.completedAt;
  }
  return { merged, changed };
}

function readLocal(storageKey: string): Json | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Json) : null;
  } catch {
    return null;
  }
}

/** Save to the member's account. Throws if it can't, so the screen can say so. */
export async function saveJourneyField(userId: string, field: JourneyField, value: Json): Promise<void> {
  if (!supabase) throw new Error("Not connected");
  const { error } = await supabase
    .from("member_journey_progress")
    .upsert({ user_id: userId, [field]: value, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

// Several cards ask for the same data at once (e.g. seven doors on load):
// share one request for a moment rather than fetching it seven times.
const inflight = new Map<string, Promise<Json | null>>();

/**
 * The signed-in member's saved state for one part of My Journey, with any
 * copy this browser still holds (from before the fix) rescued into it.
 * Returns undefined when the account can't be reached, so callers can fall
 * back to the browser copy instead of treating it as "nothing saved".
 */
export async function loadJourneyState(
  userId: string,
  field: JourneyField,
  storageKey: string
): Promise<Json | null | undefined> {
  const cacheKey = `${userId}:${field}`;
  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const run = (async (): Promise<Json | null> => {
    if (!supabase) throw new Error("Not connected");
    const { data, error } = await supabase.from("member_journey_progress").select(field).eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    const remote = ((data as Record<string, unknown> | null)?.[field] as Json | null) ?? null;

    const local = readLocal(storageKey);
    if (local && local.userId === userId) {
      const { merged, changed } = mergeJourney(field, remote, local);
      if (changed) {
        try {
          await saveJourneyField(userId, field, merged);
        } catch (e) {
          console.warn("Couldn't move journey reflections from this browser to the account yet:", e);
        }
      }
      return merged;
    }
    return remote;
  })();

  inflight.set(cacheKey, run);
  setTimeout(() => inflight.delete(cacheKey), 1500);
  try {
    return await run;
  } catch (e) {
    console.warn("Couldn't load journey from the account:", e);
    return undefined;
  }
}

/** After a save, drop the shared copy so the next read sees the new data. */
export function forgetJourneyCache(userId: string, field: JourneyField) {
  inflight.delete(`${userId}:${field}`);
}
