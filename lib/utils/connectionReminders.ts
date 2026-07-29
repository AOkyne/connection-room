// Pure, DB-free reminder/expiry timing logic, extracted from
// app/api/cron/connections-expiry/route.ts so it can be unit tested without
// a Supabase client (see lib/utils/connectionReminders.test.ts). All
// functions take `now` as an explicit parameter rather than reading
// Date.now() internally, so tests can pin time exactly.

export function isPastDeadline(deadlineAt: Date, now: Date): boolean {
  return deadlineAt.getTime() < now.getTime();
}

// True during the second half of a round's response window -- from the
// midpoint of opened_at..response_deadline_at up to (not including) the
// deadline itself.
export function isHalfwayReminderDue(openedAt: Date, deadlineAt: Date, now: Date): boolean {
  const halfwayAt = openedAt.getTime() + (deadlineAt.getTime() - openedAt.getTime()) / 2;
  return now.getTime() >= halfwayAt && now.getTime() < deadlineAt.getTime();
}

// True in the final 6 hours before a round's deadline.
export function isClosingSoonReminderDue(deadlineAt: Date, now: Date, windowHours = 6): boolean {
  const hoursLeft = (deadlineAt.getTime() - now.getTime()) / (60 * 60 * 1000);
  return hoursLeft > 0 && hoursLeft <= windowHours;
}

export type LiveReminderKey = "live_10min" | "live_1hour" | "live_24hour" | null;

// Which (if any) scheduled-live reminder is due right now, given how many
// minutes remain until scheduledStartAt. Buckets are mutually exclusive and
// checked narrowest-first so a session doesn't match more than one.
export function getDueLiveReminderKey(scheduledStartAt: Date, now: Date): LiveReminderKey {
  const minutesUntil = (scheduledStartAt.getTime() - now.getTime()) / (60 * 1000);

  if (minutesUntil > 0 && minutesUntil <= 10) return "live_10min";
  if (minutesUntil > 10 && minutesUntil <= 60) return "live_1hour";
  if (minutesUntil > 60 && minutesUntil <= 24 * 60) return "live_24hour";
  return null;
}
