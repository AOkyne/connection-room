// Events data access layer - demo mode with localStorage

import { demoEvents } from "./demo-data";
import type { Event } from "./demo-data";

const EVENTS_STORAGE_KEY = "connection-room:event-interests";
const CUSTOM_EVENTS_STORAGE_KEY = "connection-room:custom-events";

// Get all upcoming events (demo + custom)
export function getUpcomingEvents(): Event[] {
  let allEvents = [...demoEvents];

  // Add custom events from localStorage
  if (typeof window !== "undefined") {
    const customEventsStr = localStorage.getItem(CUSTOM_EVENTS_STORAGE_KEY);
    if (customEventsStr) {
      try {
        const customEvents = JSON.parse(customEventsStr);
        // Convert ISO date strings to Date objects for custom events
        const convertedCustomEvents = customEvents.map((e: any) => ({
          ...e,
          date: new Date(e.date),
          interested: false,
        }));
        allEvents = [...allEvents, ...convertedCustomEvents];
      } catch (e) {
        console.error("Error parsing custom events:", e);
      }
    }
  }

  return allEvents.filter((event) => event.date > new Date()).sort((a, b) => a.date.getTime() - b.date.getTime());
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
