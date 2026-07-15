// Converts between a naive "YYYY-MM-DDTHH:mm" wall-clock string (what
// <input type="datetime-local"> reads/writes) and a UTC instant, for a
// specific IANA timezone -- NOT the browser's own timezone. This lets an
// admin pick "6:00 PM Pacific" and have it mean 6:00 PM Pacific regardless
// of what timezone their own machine happens to be set to, and regardless
// of DST (the offset is computed for the actual date, not a fixed value).

export const EVENT_TIMEZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "UTC", label: "UTC" },
] as const;

export const DEFAULT_EVENT_TIMEZONE = "America/Los_Angeles";

// Wall-clock string in `timeZone` -> UTC ISO string.
export function zonedDatetimeLocalToISO(datetimeLocal: string, timeZone: string): string | undefined {
  if (!datetimeLocal) return undefined;

  const [datePart, timePart] = datetimeLocal.split("T");
  if (!datePart || !timePart) return undefined;
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  // Standard "double conversion" trick: treat the wall-clock numbers as a
  // UTC instant (a guess), format that instant in the target zone to see
  // what wall-clock time it reads there, and use the difference to find
  // the zone's actual offset at this date (computed per-date via
  // Intl, so DST is handled correctly rather than using a constant offset).
  //
  // Must go through Intl.formatToParts + Date.UTC on both ends, not
  // toLocaleString + `new Date(string)` -- parsing a formatted string with
  // the bare Date constructor is locale/engine-dependent and silently
  // falls back to the *system's own* local timezone, which previously
  // made this function only accidentally correct on a machine already set
  // to the target zone.
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcGuess));

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const zonedHour = get("hour") === 24 ? 0 : get("hour");
  const asIfUTC = Date.UTC(get("year"), get("month") - 1, get("day"), zonedHour, get("minute"), get("second"));

  const offset = utcGuess - asIfUTC;
  return new Date(utcGuess + offset).toISOString();
}

// UTC ISO string -> wall-clock "YYYY-MM-DDTHH:mm" string as it reads in `timeZone`.
export function isoToZonedDatetimeLocal(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  // Intl formats midnight as "24" with hour12: false in some environments; normalize.
  const hour = get("hour") === "24" ? "00" : get("hour");

  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

// Short zone label (e.g. "PDT", "PST") for a given instant + timezone --
// abbreviation changes with DST, so this is computed per-date, not static.
export function formatTimeWithZone(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}
