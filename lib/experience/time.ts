// Timezone-aware calendar helpers for "Your Experience Wanted".
//
// All timestamps are stored and passed around as UTC instants (Date).
// Policy decisions that depend on the calendar -- "same calendar month",
// "three calendar months after launch", "09:00-18:00 local" -- convert
// explicitly into an IANA timezone with Intl, so DST and month lengths
// are handled by the platform's tz database rather than by fixed offsets.

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone: string | null | undefined): timeZone is string {
  if (!timeZone) return false;
  try {
    formatterFor(timeZone).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts: Record<string, number> = {};
  for (const p of formatterFor(timeZone).formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

// Offset of `timeZone` from UTC at instant `date`, in ms (local - UTC).
function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * The UTC instant of a wall-clock time in `timeZone`. Month/day overflow is
 * normalized like Date.UTC (e.g. month 13 = January next year). A local
 * time that doesn't exist (spring-forward gap) resolves to the instant
 * just after the gap; an ambiguous one (fall-back) to the earlier instant.
 */
export function zonedToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
  second = 0
): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = wall - offsetMs(new Date(wall), timeZone);
  // Two refinement passes settle every real-world DST transition.
  for (let i = 0; i < 2; i++) {
    const next = wall - offsetMs(new Date(guess), timeZone);
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Adds calendar months in `timeZone`, keeping the local time of day and
 * clamping to the last day of a shorter month (Jan 31 + 1 month = Feb
 * 28/29) -- the same semantics as Postgres timestamp + interval 'N months'.
 */
export function addCalendarMonths(date: Date, months: number, timeZone: string): Date {
  const p = zonedParts(date, timeZone);
  const totalMonths = p.year * 12 + (p.month - 1) + months;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  const day = Math.min(p.day, daysInMonth(year, month));
  return zonedToUtc(year, month, day, p.hour, p.minute, timeZone, p.second);
}

/** "YYYY-MM" of `date` in `timeZone`. */
export function monthKey(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

/** Midnight on the 1st of the month after `date`'s month, in `timeZone`. */
export function startOfNextMonth(date: Date, timeZone: string): Date {
  const p = zonedParts(date, timeZone);
  return zonedToUtc(p.year, p.month + 1, 1, 0, 0, timeZone);
}

export const BOOTSTRAP_MONTHS = 3;

/** End of the global bootstrap period: launch + 3 calendar months, clamped. */
export function bootstrapEndFor(launchedAt: Date, timeZone: string): Date {
  return addCalendarMonths(launchedAt, BOOTSTRAP_MONTHS, timeZone);
}

export const DAY_MS = 24 * 60 * 60 * 1000;
