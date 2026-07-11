import { supabase } from "@/lib/supabase/client";

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
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(mapEventFromDb);
    } else {
      // Demo mode: fetch from localStorage
      if (typeof window === "undefined") return [];

      const events = JSON.parse(localStorage.getItem("connection-room:demo-events") || "[]");
      return events.sort((a: Event, b: Event) =>
        new Date(b.startAt || 0).getTime() - new Date(a.startAt || 0).getTime()
      );
    }
  } catch (err) {
    console.error("Error fetching admin events:", err);
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
  try {
    if (supabase) {
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
    } else {
      // Demo mode: fetch from localStorage
      if (typeof window === "undefined") return null;

      const events = JSON.parse(localStorage.getItem("connection-room:demo-events") || "[]");
      return events.find((e: Event) => e.id === id) || null;
    }
  } catch (err) {
    console.error("Error fetching event:", err);
    return null;
  }
}

// Create event
export async function createEvent(event: Partial<Event>): Promise<Event | null> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("events")
        .insert([mapEventToDb(event)])
        .select()
        .single();

      if (error) throw error;
      return data ? mapEventFromDb(data) : null;
    } else {
      // Demo mode: store in localStorage
      if (typeof window === "undefined") return null;

      const newEvent: Event = {
        id: `event-${Date.now()}`,
        title: event.title || "",
        status: event.status || "draft",
        visibility: event.visibility || "members",
        startAt: event.startAt || "",
        shortDescription: event.shortDescription,
        description: event.description,
        locationName: event.locationName,
        imageUrl: event.imageUrl,
        featured: event.featured || false,
        createdAt: new Date().toISOString(),
      };

      const events = JSON.parse(localStorage.getItem("connection-room:demo-events") || "[]");
      events.push(newEvent);
      localStorage.setItem("connection-room:demo-events", JSON.stringify(events));

      return newEvent;
    }
  } catch (err) {
    console.error("Error creating event:", err);
    return null;
  }
}

// Update event
export async function updateEvent(id: string, event: Partial<Event>): Promise<Event | null> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("events")
        .update({
          ...mapEventToDb(event),
          updated_at: new Date(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data ? mapEventFromDb(data) : null;
    } else {
      // Demo mode: update in localStorage
      if (typeof window === "undefined") return null;

      const events = JSON.parse(localStorage.getItem("connection-room:demo-events") || "[]");
      const index = events.findIndex((e: Event) => e.id === id);

      if (index === -1) return null;

      events[index] = {
        ...events[index],
        ...event,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem("connection-room:demo-events", JSON.stringify(events));
      return events[index];
    }
  } catch (err) {
    console.error("Error updating event:", err);
    return null;
  }
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
