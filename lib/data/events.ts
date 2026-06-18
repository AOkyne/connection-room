// Events data access layer - demo mode with localStorage

import { demoEvents } from "./demo-data";
import type { Event } from "./demo-data";

const EVENTS_STORAGE_KEY = "connection-room:event-interests";

// Get all upcoming events
export function getUpcomingEvents(): Event[] {
  return demoEvents.filter((event) => event.date > new Date());
}

// Get user's event interests
export function getUserEventInterests(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();

  const stored = localStorage.getItem(`${EVENTS_STORAGE_KEY}:${userId}`);
  return stored ? new Set(JSON.parse(stored)) : new Set();
}

// Toggle interest in an event
export function toggleEventInterest(userId: string, eventId: string): boolean {
  if (typeof window === "undefined") return false;

  const interests = getUserEventInterests(userId);
  const isInterested = interests.has(eventId);

  if (isInterested) {
    interests.delete(eventId);
  } else {
    interests.add(eventId);
  }

  localStorage.setItem(`${EVENTS_STORAGE_KEY}:${userId}`, JSON.stringify(Array.from(interests)));
  return !isInterested;
}

// Get events user is interested in
export function getUserEventInterestsList(userId: string): Event[] {
  const interests = getUserEventInterests(userId);
  return getUpcomingEvents().filter((event) => interests.has(event.id));
}
