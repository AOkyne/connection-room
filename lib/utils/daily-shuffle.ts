// A shuffle that's different for each member and each day, but identical
// for the same member all day long -- so lists rotate who's at the top
// without "Load more" ever repeating or skipping anyone mid-day.

/** Today's date in Los Angeles, e.g. "2026-11-23" (the community's clock). */
export function laDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function hashString(input: string): number {
  // FNV-1a, 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a new array in an order fixed by `seed` (Fisher-Yates). */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const rand = mulberry32(hashString(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Shuffle for this member, today. `purpose` keeps different lists independent. */
export function dailyShuffle<T>(items: readonly T[], memberId: string, purpose: string, now: Date = new Date()): T[] {
  return seededShuffle(items, `${purpose}:${memberId}:${laDateKey(now)}`);
}
