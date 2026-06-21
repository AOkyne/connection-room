// Event reminder system - tracks when users have been reminded about events

import type { Event } from "./demo-data";

const REMINDERS_STORAGE_KEY = "connection-room:event-reminders";

interface ReminderRecord {
  eventId: string;
  userId: string;
  reminderTime: number; // timestamp of when reminder was shown
  timingType: "week" | "day" | "hour"; // what reminder type this was
}

// Get all reminder records for a user
function getUserReminderRecords(userId: string): ReminderRecord[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(`${REMINDERS_STORAGE_KEY}:${userId}`);
  return stored ? JSON.parse(stored) : [];
}

// Save reminder records
function saveUserReminderRecords(userId: string, records: ReminderRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${REMINDERS_STORAGE_KEY}:${userId}`, JSON.stringify(records));
}

// Check if a reminder has been shown for an event
function hasReminder(userId: string, eventId: string, timingType: "week" | "day" | "hour"): boolean {
  const records = getUserReminderRecords(userId);
  return records.some(r => r.eventId === eventId && r.timingType === timingType);
}

// Record that a reminder was shown
function recordReminder(userId: string, eventId: string, timingType: "week" | "day" | "hour"): void {
  const records = getUserReminderRecords(userId);
  records.push({
    eventId,
    userId,
    reminderTime: Date.now(),
    timingType,
  });
  saveUserReminderRecords(userId, records);
}

// Get pending reminders for user's interested events
export function getPendingReminders(userId: string, interestedEvents: Event[]): Array<{
  event: Event;
  timing: "within_week" | "within_day" | "within_hour";
}> {
  const now = new Date();
  const pending: Array<{
    event: Event;
    timing: "within_week" | "within_day" | "within_hour";
  }> = [];

  for (const event of interestedEvents) {
    const timeUntilEvent = event.date.getTime() - now.getTime();
    const hoursUntil = timeUntilEvent / (1000 * 60 * 60);
    const daysUntil = hoursUntil / 24;

    // 1 hour reminder
    if (hoursUntil <= 1 && hoursUntil > 0 && !hasReminder(userId, event.id, "hour")) {
      recordReminder(userId, event.id, "hour");
      pending.push({ event, timing: "within_hour" });
    }
    // 1 day reminder
    else if (daysUntil <= 1 && daysUntil > 0 && !hasReminder(userId, event.id, "day")) {
      recordReminder(userId, event.id, "day");
      pending.push({ event, timing: "within_day" });
    }
    // 1 week reminder
    else if (daysUntil <= 7 && daysUntil > 1 && !hasReminder(userId, event.id, "week")) {
      recordReminder(userId, event.id, "week");
      pending.push({ event, timing: "within_week" });
    }
  }

  return pending;
}

// Get reminder message
export function getReminderMessage(event: Event, timing: "within_week" | "within_day" | "within_hour"): string {
  const eventName = event.title;
  const eventDate = event.date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  switch (timing) {
    case "within_week":
      return `${eventName} is coming up on ${eventDate}. You marked interest in this event!`;
    case "within_day":
      return `${eventName} is happening tomorrow at ${event.time}. Ready to join?`;
    case "within_hour":
      return `${eventName} starts in less than an hour! Join now if you're attending.`;
  }
}

// Clear all reminders for an event (e.g., after user attends)
export function clearEventReminders(userId: string, eventId: string): void {
  const records = getUserReminderRecords(userId);
  const filtered = records.filter(r => r.eventId !== eventId);
  saveUserReminderRecords(userId, filtered);
}
