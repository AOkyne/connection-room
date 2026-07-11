import { supabase } from "@/lib/supabase/client";

// Helper to timeout async operations
function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, timeoutMs: number = 5000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export interface Event {
  id: string;
  title: string;
  slug?: string;
  subtitle?: string;
  description?: string;
  shortDescription?: string;
  eventType?: string;
  status: "draft" | "published" | "cancelled" | "archived";
  visibility: "public" | "members" | "admin_only";
  startAt: string;
  endAt?: string;
  timezone?: string;
  locationType?: "online" | "in_person" | "hybrid" | "tbd";
  locationName?: string;
  locationAddress?: string;
  onlineUrl?: string;
  imageUrl?: string;
  capacity?: number;
  spotsTaken?: number;
  registrationRequired?: boolean;
  registrationUrl?: string;
  priceCents?: number;
  currency?: string;
  hostName?: string;
  hostProfileId?: string;
  relatedSpaceId?: string;
  tags?: string[];
  featured?: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  registrationCount?: number;
}

// Get all events (admin)
export async function getAdminEvents(): Promise<Event[]> {
  // Try Supabase first (source of truth) with timeout
  if (supabase) {
    try {
      const supabasePromise = supabase
        .from("events")
        .select("*")
        .order("start_at", { ascending: false });

      const { data, error } = await withTimeout(supabasePromise, 5000);

      if (error) throw error;

      const events = (data || []).map(mapEventFromDb);

      // Update localStorage cache with Supabase data
      if (typeof window !== "undefined" && events.length > 0) {
        try {
          localStorage.setItem("connection-room:demo-events", JSON.stringify(events));
        } catch (err) {
          console.warn("Could not cache events in localStorage:", err);
        }
      }

      return events;
    } catch (err) {
      console.error("Error fetching events from Supabase, falling back to localStorage:", err);
      // Fall through to localStorage fallback below
    }
  }

  // Fallback to localStorage if Supabase fails
  try {
    if (typeof window === "undefined") return [];

    const events = JSON.parse(localStorage.getItem("connection-room:demo-events") || "[]");
    return events.sort((a: Event, b: Event) =>
      new Date(b.startAt || 0).getTime() - new Date(a.startAt || 0).getTime()
    );
  } catch (err) {
    console.error("Error fetching events from localStorage:", err);
    return [];
  }
}

// Get published events (public)
export async function getPublicEvents(): Promise<Event[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("events")
      .select(
        `*,
        event_registrations(count)`
      )
      .eq("status", "published")
      .in("visibility", ["public", "members"])
      .order("start_at", { ascending: false });

    if (error) throw error;

    return (data || []).map(mapEventFromDb);
  } catch (err) {
    console.error("Error fetching public events:", err);
    return [];
  }
}

// Get single event
export async function getEvent(id: string): Promise<Event | null> {
  // Try Supabase first if available
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(
          `*,
          event_registrations(count)`
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data ? mapEventFromDb(data) : null;
    } catch (err) {
      console.error("Error fetching event from Supabase, falling back to demo mode:", err);
      // Fall through to demo mode below
    }
  }

  // Demo mode: fetch from localStorage
  try {
    if (typeof window === "undefined") return null;

    const events = JSON.parse(localStorage.getItem("connection-room:demo-events") || "[]");
    return events.find((e: Event) => e.id === id) || null;
  } catch (err) {
    console.error("Error fetching event from localStorage:", err);
    return null;
  }
}

// Create event
export async function createEvent(event: Partial<Event>): Promise<Event | null> {
  console.log("[createEvent] Starting with event:", { title: event.title, status: event.status });
  let createdEvent: Event | null = null;

  // Try Supabase first (source of truth) with timeout
  if (supabase) {
    console.log("[createEvent] Attempting Supabase creation...");
    try {
      const supabasePromise = supabase
        .from("events")
        .insert([mapEventToDb(event)])
        .select()
        .single();

      console.log("[createEvent] Waiting for Supabase response (5s timeout)...");
      const { data, error } = await withTimeout(supabasePromise, 5000);

      if (error) {
        console.error("[createEvent] Supabase returned error:", error);
        throw error;
      }
      if (data) {
        createdEvent = mapEventFromDb(data);
        console.log("[createEvent] Supabase success:", createdEvent.id);
      }
    } catch (err) {
      console.error("[createEvent] Supabase failed:", err instanceof Error ? err.message : err);
      // Don't return yet - try localStorage as fallback
    }
  } else {
    console.log("[createEvent] Supabase not available, skipping");
  }

  // If Supabase failed, create in localStorage
  if (!createdEvent) {
    console.log("[createEvent] Supabase failed or unavailable, creating in localStorage...");
    try {
      if (typeof window === "undefined") {
        console.error("[createEvent] Not in browser environment");
        return null;
      }

      createdEvent = {
        id: `event-${Date.now()}`,
        title: event.title || "",
        status: event.status || "draft",
        visibility: event.visibility || "members",
        startAt: event.startAt || "",
        shortDescription: event.shortDescription,
        description: event.description,
        locationName: event.locationName,
        featured: event.featured || false,
        priceCents: event.priceCents,
        currency: event.currency,
        createdAt: new Date().toISOString(),
      };
      console.log("[createEvent] Created event in memory:", createdEvent.id);
    } catch (err) {
      console.error("[createEvent] Failed to create event in memory:", err);
      return null;
    }
  }

  // Always update localStorage cache (excluding base64 image data)
  if (createdEvent) {
    console.log("[createEvent] Updating localStorage cache...");
    try {
      if (typeof window !== "undefined") {
        const eventWithoutImage = { ...createdEvent };
        delete (eventWithoutImage as any).imageUrl;

        const events = JSON.parse(localStorage.getItem("connection-room:demo-events") || "[]");
        events.push(eventWithoutImage);
        localStorage.setItem("connection-room:demo-events", JSON.stringify(events));
        console.log("[createEvent] Successfully cached to localStorage. Total events:", events.length);
      }
    } catch (err) {
      console.warn("[createEvent] Could not cache event in localStorage:", err);
    }
  }

  console.log("[createEvent] Returning createdEvent:", createdEvent ? createdEvent.id : "null");
  return createdEvent;
}

// Update event
export async function updateEvent(id: string, event: Partial<Event>): Promise<Event | null> {
  let updatedEvent: Event | null = null;

  // Try Supabase first (source of truth) with timeout
  if (supabase) {
    try {
      const supabasePromise = supabase
        .from("events")
        .update({
          ...mapEventToDb(event),
          updated_at: new Date(),
        })
        .eq("id", id)
        .select()
        .single();

      const { data, error } = await withTimeout(supabasePromise, 5000);

      if (error) throw error;
      if (data) {
        updatedEvent = mapEventFromDb(data);
      }
    } catch (err) {
      console.error("Error updating event in Supabase:", err);
      // Don't return yet - try localStorage as fallback
    }
  }

  // If Supabase failed, update in localStorage
  if (!updatedEvent) {
    try {
      if (typeof window === "undefined") return null;

      const events = JSON.parse(localStorage.getItem("connection-room:demo-events") || "[]");
      const index = events.findIndex((e: Event) => e.id === id);

      if (index === -1) return null;

      const updateData = { ...event };
      if (updateData.imageUrl && updateData.imageUrl.startsWith("data:")) {
        delete updateData.imageUrl;
      }

      events[index] = {
        ...events[index],
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      updatedEvent = events[index];
    } catch (err) {
      console.error("Error updating event:", err);
      return null;
    }
  }

  // Always update localStorage cache (excluding base64 image data)
  try {
    if (typeof window !== "undefined" && updatedEvent) {
      const events = JSON.parse(localStorage.getItem("connection-room:demo-events") || "[]");
      const index = events.findIndex((e: Event) => e.id === id);

      if (index !== -1) {
        const eventWithoutImage = { ...updatedEvent };
        delete (eventWithoutImage as any).imageUrl;
        events[index] = eventWithoutImage;
        localStorage.setItem("connection-room:demo-events", JSON.stringify(events));
      }
    }
  } catch (err) {
    console.warn("Could not cache event in localStorage:", err);
  }

  return updatedEvent;
}

// Delete event
export async function deleteEvent(id: string): Promise<boolean> {
  try {
    if (supabase) {
      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) throw error;
      return true;
    } else {
      // Demo mode: delete from localStorage
      if (typeof window === "undefined") return false;

      const events = JSON.parse(localStorage.getItem("connection-room:demo-events") || "[]");
      const filtered = events.filter((e: Event) => e.id !== id);

      if (filtered.length === events.length) return false;

      localStorage.setItem("connection-room:demo-events", JSON.stringify(filtered));
      return true;
    }
  } catch (err) {
    console.error("Error deleting event:", err);
    return false;
  }
}

// Register for event
export async function registerForEvent(eventId: string, profileId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from("event_registrations").insert([
      {
        event_id: eventId,
        profile_id: profileId,
        status: "registered",
      },
    ]);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error registering for event:", err);
    return false;
  }
}

// Cancel event registration
export async function cancelEventRegistration(eventId: string, profileId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("event_registrations")
      .update({ status: "cancelled", cancelled_at: new Date() })
      .eq("event_id", eventId)
      .eq("profile_id", profileId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error cancelling registration:", err);
    return false;
  }
}

// Helper functions
function mapEventFromDb(dbEvent: any): Event {
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    slug: dbEvent.slug,
    subtitle: dbEvent.subtitle,
    description: dbEvent.description,
    shortDescription: dbEvent.short_description,
    eventType: dbEvent.event_type,
    status: dbEvent.status,
    visibility: dbEvent.visibility,
    startAt: dbEvent.start_at,
    endAt: dbEvent.end_at,
    timezone: dbEvent.timezone,
    locationType: dbEvent.location_type,
    locationName: dbEvent.location_name,
    locationAddress: dbEvent.location_address,
    onlineUrl: dbEvent.online_url,
    imageUrl: dbEvent.image_url,
    capacity: dbEvent.capacity,
    spotsTaken: dbEvent.spots_taken,
    registrationRequired: dbEvent.registration_required,
    registrationUrl: dbEvent.registration_url,
    priceCents: dbEvent.price_cents,
    currency: dbEvent.currency,
    hostName: dbEvent.host_name,
    hostProfileId: dbEvent.host_profile_id,
    relatedSpaceId: dbEvent.related_space_id,
    tags: dbEvent.tags,
    featured: dbEvent.featured,
    createdBy: dbEvent.created_by,
    updatedBy: dbEvent.updated_by,
    createdAt: dbEvent.created_at,
    updatedAt: dbEvent.updated_at,
    registrationCount: dbEvent.event_registrations?.[0]?.count || 0,
  };
}

function mapEventToDb(event: Partial<Event>): any {
  return {
    title: event.title,
    slug: event.slug,
    subtitle: event.subtitle,
    description: event.description,
    short_description: event.shortDescription,
    event_type: event.eventType,
    status: event.status,
    visibility: event.visibility,
    start_at: event.startAt,
    end_at: event.endAt,
    timezone: event.timezone,
    location_type: event.locationType,
    location_name: event.locationName,
    location_address: event.locationAddress,
    online_url: event.onlineUrl,
    image_url: event.imageUrl,
    capacity: event.capacity,
    spots_taken: event.spotsTaken,
    registration_required: event.registrationRequired,
    registration_url: event.registrationUrl,
    price_cents: event.priceCents,
    currency: event.currency,
    host_name: event.hostName,
    host_profile_id: event.hostProfileId,
    related_space_id: event.relatedSpaceId,
    tags: event.tags,
    featured: event.featured,
  };
}
