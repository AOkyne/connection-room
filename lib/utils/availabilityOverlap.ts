// Pure, DB-free overlap calculation for scheduled live conversations. Kept
// separate from lib/data/connectionAsync.ts so it can be unit tested
// without a Supabase client (see the Vitest suite in
// lib/utils/availabilityOverlap.test.ts).
//
// All arithmetic is done on Date objects, which are UTC-instant based --
// timezone only matters for how a slot is *displayed*, never for whether
// two windows overlap. Callers store/display timezone separately (see
// connection_availability.timezone) but this function never needs it.

export interface AvailabilityWindow {
  startsAt: Date;
  endsAt: Date;
}

export interface LiveSlot {
  startsAt: Date;
  endsAt: Date;
}

// Returns every discrete `slotMinutes`-long slot that fits inside the
// overlap of at least one window from each side, starting on `slotMinutes`
// boundaries within the overlap (not wall-clock boundaries) so a slot is
// never offered "just past" one side's actual availability.
export function calculateOverlappingSlots(
  mine: AvailabilityWindow[],
  theirs: AvailabilityWindow[],
  slotMinutes = 20
): LiveSlot[] {
  const slotMs = slotMinutes * 60 * 1000;
  const slots: LiveSlot[] = [];

  for (const a of mine) {
    for (const b of theirs) {
      const start = new Date(Math.max(a.startsAt.getTime(), b.startsAt.getTime()));
      const end = new Date(Math.min(a.endsAt.getTime(), b.endsAt.getTime()));
      const overlapMs = end.getTime() - start.getTime();
      if (overlapMs < slotMs) continue;

      const slotCount = Math.floor(overlapMs / slotMs);
      for (let i = 0; i < slotCount; i++) {
        const slotStart = new Date(start.getTime() + i * slotMs);
        slots.push({ startsAt: slotStart, endsAt: new Date(slotStart.getTime() + slotMs) });
      }
    }
  }

  // De-duplicate identical slot starts (possible if multiple window pairs
  // produce the same slot) and sort chronologically.
  const seen = new Set<number>();
  return slots
    .filter((s) => {
      if (seen.has(s.startsAt.getTime())) return false;
      seen.add(s.startsAt.getTime());
      return true;
    })
    .sort((x, y) => x.startsAt.getTime() - y.startsAt.getTime());
}
