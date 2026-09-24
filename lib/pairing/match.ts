// Pure pairing logic for the weekly pairing job
// (app/api/cron/weekly-pairings/route.ts) -- no Supabase dependency, so
// it's unit-tested directly (match.test.ts). The random source is
// injectable for deterministic tests.
//
// "Lightly matched": each member is paired with whichever remaining
// candidate scores highest on simple, explainable signals (shared
// interests, same city, shared spaces), plus a random jitter large enough
// that the pairing still feels serendipitous rather than algorithmic --
// two people with nothing obviously in common still get paired sometimes.

export interface PairingCandidate {
  userId: string;
  interests: string[];
  city: string;
  spaces: string[];
  // Sat out last week (odd one out, or no eligible partner) -- goes to the
  // front of the line this week so nobody sits out twice in a row when a
  // partner is available.
  satOutLastWeek: boolean;
}

export interface WeeklyPairsResult {
  pairs: Array<[string, string]>;
  unpaired: string[];
}

// Tuned so a strong overlap usually wins but never always: two shared
// interests (6) beat an empty match most of the time, not every time.
const RANDOM_JITTER = 4;

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function cityOf(location: string | null | undefined): string {
  return (location || "").split(",")[0].trim().toLowerCase();
}

export function compatibilityScore(a: PairingCandidate, b: PairingCandidate): number {
  const bInterests = new Set(b.interests.map((i) => i.toLowerCase()));
  const sharedInterests = a.interests.filter((i) => bInterests.has(i.toLowerCase())).length;

  const bSpaces = new Set(b.spaces);
  const sharedSpaces = a.spaces.filter((s) => bSpaces.has(s)).length;

  const sameCity = a.city && a.city === b.city ? 1 : 0;

  return sharedInterests * 3 + sameCity * 2 + Math.min(sharedSpaces, 3);
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// excludedPairs: pairKey()s that must never be matched -- anyone already
// connected in any way (so nobody gets someone they already know or were
// paired with before) and anyone blocked in either direction.
export function buildWeeklyPairs(
  candidates: PairingCandidate[],
  excludedPairs: Set<string>,
  random: () => number = Math.random
): WeeklyPairsResult {
  const shuffled = shuffle(candidates, random);
  // Stable after the shuffle: sat-out members first, otherwise random order.
  const ordered = [...shuffled.filter((c) => c.satOutLastWeek), ...shuffled.filter((c) => !c.satOutLastWeek)];

  const paired = new Set<string>();
  const pairs: Array<[string, string]> = [];

  for (const member of ordered) {
    if (paired.has(member.userId)) continue;

    let best: PairingCandidate | null = null;
    let bestScore = -Infinity;
    for (const other of ordered) {
      if (other.userId === member.userId || paired.has(other.userId)) continue;
      if (excludedPairs.has(pairKey(member.userId, other.userId))) continue;
      const score = compatibilityScore(member, other) + random() * RANDOM_JITTER;
      if (score > bestScore) {
        bestScore = score;
        best = other;
      }
    }

    if (best) {
      paired.add(member.userId);
      paired.add(best.userId);
      pairs.push([member.userId, best.userId]);
    }
  }

  const unpaired = candidates.map((c) => c.userId).filter((id) => !paired.has(id));
  return { pairs, unpaired };
}

// Monday (UTC) of the week containing `date`, as YYYY-MM-DD -- the
// week_start key the weekly_pairings table is unique on.
export function weekStartOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d.toISOString().slice(0, 10);
}
