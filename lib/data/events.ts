// Events data access layer - loads from Supabase
import { createClient } from "@supabase/supabase-js";
import { demoEvents } from "./demo-data";
import type { Event } from "./demo-data";
import { formatTimeWithZone } from "@/lib/utils/timezone";
import { getUserRegistrations } from "@/lib/admin/registrations";

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
      // Show the explicit event timezone (e.g. "6:00 PM PDT") when one was
      // set, rather than silently converting to the viewer's own device
      // timezone -- for a scheduled group call, everyone needs to agree on
      // what "6:00 PM" means, not each see a different unlabeled time.
      // Falls back to the viewer's local time for older events saved
      // before timezone was captured.
      time: e.start_at
        ? e.timezone
          ? formatTimeWithZone(e.start_at, e.timezone)
          : new Date(e.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        : "TBD",
      location: e.location_name || e.location_address || e.location,
      format: normalizeFormat(e.event_type || e.format),
      onlineUrl: e.online_url,
      timezone: e.timezone,
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

// Upcoming events a user has registered or marked interested in -- cross-
// references the real `event_registrations` table (source of truth for both
// the events page's own state and admin's registration lists) against
// upcoming events, rather than a separate, never-written-to localStorage
// key that no registration/interest action actually updates.
export async function getUserUpcomingEvents(userId: string): Promise<Event[]> {
  const [registrations, upcomingEvents] = await Promise.all([
    getUserRegistrations(userId),
    getUpcomingEvents(),
  ]);
  const registeredEventIds = new Set(registrations.map((r) => r.eventId));
  return upcomingEvents.filter((event) => registeredEventIds.has(event.id));
}
