// Events data access layer - loads from Supabase
import { createClient } from "@supabase/supabase-js";
import { demoEvents } from "./demo-data";
import type { Event } from "./demo-data";

const EVENTS_STORAGE_KEY = "connection-room:event-interests";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// Helper to load and convert all events from Supabase
// Admin forms write "online" as the event_type; the public UI's format
// filter buttons and badges use "virtual" — normalize here.
function normalizeFormat(eventType: string | null | undefined): "virtual" | "in-person" | "hybrid" {
  if (eventType === "in-person" || eventType === "hybrid") return eventType;
  return "virtual";
}

async function getAllEventsFromSupabase(): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*, event_registrations(count)")
      .order("start_at", { ascending: true });

    if (error) {
      console.error("Error loading events from Supabase:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Convert Supabase events to Event interface.
    // Admin writes location_name/event_type/host_name (not location/format/facilitator).
    return data.map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: new Date(e.start_at),
      time: e.start_at
        ? new Date(e.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        : "TBD",
      location: e.location_name || e.location_address || e.location,
      format: normalizeFormat(e.event_type || e.format),
      facilitator: e.host_name || e.facilitator,
      interested: false,
      attendeeCount: e.event_registrations?.[0]?.count ?? e.attendee_count ?? 0,
      imageUrl: e.image_url,
      priceCents: e.price_cents,
      currency: e.currency,
    }));
  } catch (e) {
    console.error("Error loading events from Supabase:", e);
    return [];
  }
}

// Fallback to sync version for SSR
function getAllEvents(): Event[] {
  return [...demoEvents];
}

// Get all upcoming events from Supabase
export async function getUpcomingEvents(): Promise<Event[]> {
  const allEvents = await getAllEventsFromSupabase();
  return allEvents
    .filter((event) => event.date > new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

// Get all past events from Supabase
export async function getPastEvents(): Promise<Event[]> {
  const allEvents = await getAllEventsFromSupabase();
  return allEvents
    .filter((event) => event.date <= new Date())
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

// Server-side version for SSR (uses demo data as fallback)
export function getUpcomingEventsFallback(): Event[] {
  return getAllEvents()
    .filter((event) => event.date > new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

// Server-side version for SSR (uses demo data as fallback)
export function getPastEventsFallback(): Event[] {
  return getAllEvents()
    .filter((event) => event.date <= new Date())
    .sort((a, b) => b.date.getTime() - a.date.getTime());
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
export async function getUserEventInterestsList(userId: string): Promise<Event[]> {
  const interests = getUserEventInterests(userId);
  const upcomingEvents = await getUpcomingEvents();
  return upcomingEvents.filter((event) => interests.has(event.id));
}
