import { supabase } from "@/lib/supabase/client";
import { fireWorkshopCreationWebhook, type WorkshopCreationPayload, type WorkshopCreationResponse } from "@/lib/webhooks/workshop-creation";
import { fireWorkshopDeletionWebhook } from "@/lib/webhooks/workshop-deletion";
import { fireWorkshopUpdateWebhook, type WorkshopUpdatePayload } from "@/lib/webhooks/workshop-update";
import { deleteZoomMeetingForEvent } from "@/lib/admin/zoom-client";

// Helper to timeout async operations
function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, timeoutMs: number = 5000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// Workshop Ops only runs in-person and hybrid workshops -- purely online
// events have nothing for it to track, so they're excluded from sync.
function shouldSyncEventToWorkshopOps(locationType?: Event["locationType"]): boolean {
  return locationType === "in_person" || locationType === "hybrid";
}

function toWorkshopDateTimeFields(startAt: string, endAt?: string) {
  const dateString = new Date(startAt).toISOString().split("T")[0];
  const startTime = new Date(startAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const endTime = endAt
    ? new Date(endAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
    : undefined;
  return { dateString, startTime, endTime };
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
  workshopId?: string;
  checkinUrl?: string;
  feedbackUrl?: string;
}

// Get all events (admin)
export async function getAdminEvents(): Promise<Event[]> {
  let supabaseEvents: Event[] = [];
  let localEvents: Event[] = [];

  // Try Supabase first (source of truth)
  if (supabase) {
    try {
      const supabasePromise = supabase
        .from("events")
        .select("*")
        .order("start_at", { ascending: false });

      const { data, error } = await withTimeout(supabasePromise, 15000);

      if (error) throw error;

      supabaseEvents = (data || []).map(mapEventFromDb);
      console.log("[getAdminEvents] Loaded from Supabase:", supabaseEvents.length, "events");
    } catch (err) {
      console.error("[getAdminEvents] Supabase failed:", err instanceof Error ? err.message : err);
    }
  }

  // Also load localStorage
  try {
    if (typeof window !== "undefined") {
      localEvents = JSON.parse(localStorage.getItem("connection-room:custom-events") || "[]");
      console.log("[getAdminEvents] Loaded from localStorage:", localEvents.length, "events");
    }
  } catch (err) {
    console.error("[getAdminEvents] Error loading localStorage:", err);
  }

  // Merge both sources: Supabase is primary, but include any local-only events
  if (supabaseEvents.length > 0) {
    const supabaseIds = new Set(supabaseEvents.map(e => e.id));
    const localOnlyEvents = localEvents.filter(e => !supabaseIds.has(e.id));

    const merged = [...supabaseEvents, ...localOnlyEvents];
    console.log("[getAdminEvents] Merged results:", merged.length, "total (Supabase:", supabaseEvents.length, '+ local-only:', localOnlyEvents.length, ')');

    return merged.sort((a: Event, b: Event) =>
      new Date(b.startAt || 0).getTime() - new Date(a.startAt || 0).getTime()
    );
  }

  // If Supabase failed, use localStorage only
  if (localEvents.length > 0) {
    console.log("[getAdminEvents] Using localStorage only:", localEvents.length, "events");
    return localEvents.sort((a: Event, b: Event) =>
      new Date(b.startAt || 0).getTime() - new Date(a.startAt || 0).getTime()
    );
  }

  console.log("[getAdminEvents] No events found anywhere");
  return [];
}

// Get published events (public)
export async function getPublicEvents(): Promise<Event[]> {
  let supabaseEvents: Event[] = [];
  let localEvents: Event[] = [];

  // Try Supabase first
  if (supabase) {
    try {
      const supabasePromise = supabase
        .from("events")
        .select(
          `*,
          event_registrations(count)`
        )
        .eq("status", "published")
        .in("visibility", ["public", "members"])
        .order("start_at", { ascending: false });

      const { data, error } = await withTimeout(supabasePromise, 15000);

      if (error) throw error;

      supabaseEvents = (data || []).map(mapEventFromDb);
      console.log("[getPublicEvents] Loaded from Supabase:", supabaseEvents.length, "events");
    } catch (err) {
      console.error("[getPublicEvents] Supabase failed:", err instanceof Error ? err.message : err);
    }
  }

  // Also load published events from localStorage
  try {
    if (typeof window !== "undefined") {
      const allLocalEvents = JSON.parse(localStorage.getItem("connection-room:custom-events") || "[]");
      localEvents = allLocalEvents.filter((e: Event) => e.status === "published" && (e.visibility === "public" || e.visibility === "members"));
      console.log("[getPublicEvents] Loaded from localStorage:", localEvents.length, "events");
    }
  } catch (err) {
    console.error("[getPublicEvents] Error loading localStorage:", err);
  }

  // Merge both sources
  if (supabaseEvents.length > 0 || localEvents.length > 0) {
    const supabaseIds = new Set(supabaseEvents.map(e => e.id));
    const localOnlyEvents = localEvents.filter(e => !supabaseIds.has(e.id));

    const merged = [...supabaseEvents, ...localOnlyEvents];
    console.log("[getPublicEvents] Merged results:", merged.length, "total (Supabase:", supabaseEvents.length, '+ local-only:', localOnlyEvents.length, ')');

    return merged.sort((a: Event, b: Event) =>
      new Date(b.startAt || 0).getTime() - new Date(a.startAt || 0).getTime()
    );
  }

  console.log("[getPublicEvents] No published events found");
  return [];
}

// Get single event
export async function getEvent(id: string): Promise<Event | null> {
  // Try Supabase first if available
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
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

    const events = JSON.parse(localStorage.getItem("connection-room:custom-events") || "[]");
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
      const { data, error } = await withTimeout(supabasePromise, 15000);

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

  // Always update localStorage cache (including images)
  if (createdEvent) {
    console.log("[createEvent] Updating localStorage cache...");
    try {
      if (typeof window !== "undefined") {
        const events = JSON.parse(localStorage.getItem("connection-room:custom-events") || "[]");
        events.push(createdEvent);
        localStorage.setItem("connection-room:custom-events", JSON.stringify(events));
        console.log("[createEvent] Successfully cached to localStorage. Total events:", events.length);
      }
    } catch (err) {
      console.warn("[createEvent] Could not cache event in localStorage:", err instanceof Error ? err.message : err);
    }

    // Fire workshop creation webhook asynchronously (non-blocking) -- only
    // for in-person/hybrid events; a purely online event has no Workshop
    // Ops counterpart.
    if (createdEvent.startAt && shouldSyncEventToWorkshopOps(createdEvent.locationType)) {
      const { dateString, startTime, endTime } = toWorkshopDateTimeFields(createdEvent.startAt, createdEvent.endAt);

      const workshopPayload: WorkshopCreationPayload = {
        eventId: createdEvent.id,
        eventTitle: createdEvent.title,
        eventDate: dateString,
        startTime,
        endTime,
        location: createdEvent.locationName || createdEvent.locationAddress,
        description: createdEvent.description || createdEvent.shortDescription,
      };

      // Callback to handle workshop response and update event record
      const handleWorkshopResponse = async (workshopData: WorkshopCreationResponse) => {
        // Update event in Supabase if available
        if (supabase) {
          try {
            const { error } = await supabase
              .from("events")
              .update({
                workshop_id: workshopData.workshopId,
                checkin_url: workshopData.checkinUrl,
                feedback_url: workshopData.feedbackUrl,
              })
              .eq("id", createdEvent.id);

            if (error) {
              console.error("[createEvent] Failed to update Supabase with workshop data:", error);
              throw error;
            }
          } catch (err) {
            console.warn("[createEvent] Could not update Supabase with workshop data, updating localStorage:", err);
            // Fall through to localStorage update
          }
        }

        // Also update localStorage
        if (typeof window !== "undefined") {
          try {
            const events = JSON.parse(localStorage.getItem("connection-room:custom-events") || "[]");
            const eventIndex = events.findIndex((e: Event) => e.id === createdEvent.id);

            if (eventIndex !== -1) {
              events[eventIndex] = {
                ...events[eventIndex],
                workshopId: workshopData.workshopId,
                checkinUrl: workshopData.checkinUrl,
                feedbackUrl: workshopData.feedbackUrl,
              };
              localStorage.setItem("connection-room:custom-events", JSON.stringify(events));
            }
          } catch (err) {
            console.warn("[createEvent] Could not update localStorage with workshop data:", err);
          }
        }
      };

      console.log("[createEvent] Firing workshop creation webhook...");
      fireWorkshopCreationWebhook(workshopPayload, handleWorkshopResponse);
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
      // mapEventToDb() always includes an id -- falling back to a freshly
      // generated one if the caller's partial event doesn't have one, which
      // is correct for createEvent() but not here: including it in an
      // UPDATE payload tries to overwrite the row's real id with that
      // fallback value, which then fails with a foreign key violation
      // against event_registrations (or any other table referencing the
      // real id) the moment the event has any registrations at all.
      const { id: _ignoredId, ...eventFieldsToUpdate } = mapEventToDb(event);

      const supabasePromise = supabase
        .from("events")
        .update({
          ...eventFieldsToUpdate,
          updated_at: new Date(),
        })
        .eq("id", id)
        .select()
        .single();

      const { data, error } = await withTimeout(supabasePromise, 15000);

      if (error) throw error;
      if (data) {
        updatedEvent = mapEventFromDb(data);
      }
    } catch (err) {
      console.error("Error updating event in Supabase:", err instanceof Error ? err.message : JSON.stringify(err));
      // Don't return yet - try localStorage as fallback
    }
  }

  // If Supabase failed, update in localStorage
  if (!updatedEvent) {
    console.log("[updateEvent] Supabase failed, attempting localStorage update for ID:", id);
    try {
      if (typeof window === "undefined") {
        console.error("[updateEvent] Not in browser environment");
        return null;
      }

      const events = JSON.parse(localStorage.getItem("connection-room:custom-events") || "[]");
      console.log("[updateEvent] Found", events.length, "events in localStorage");

      const index = events.findIndex((e: Event) => e.id === id);
      console.log("[updateEvent] Looking for ID", id, "- found at index:", index);

      if (index === -1) {
        console.error("[updateEvent] Event not found in localStorage");
        return null;
      }

      events[index] = {
        ...events[index],
        ...event,
        updatedAt: new Date().toISOString(),
      };

      updatedEvent = events[index];
      console.log("[updateEvent] Updated event in memory, now saving to localStorage");
    } catch (err) {
      console.error("[updateEvent] Error updating event:", err);
      return null;
    }
  }

  // Always update localStorage cache (including images)
  try {
    if (typeof window !== "undefined" && updatedEvent) {
      const events = JSON.parse(localStorage.getItem("connection-room:custom-events") || "[]");
      console.log("[updateEvent] Current events in localStorage before save:", events.map((e: Event) => e.id));

      const index = events.findIndex((e: Event) => e.id === id);
      console.log("[updateEvent] Looking for ID:", id, "Found at index:", index);

      if (index !== -1) {
        const beforeSave = JSON.stringify(events);
        events[index] = updatedEvent;
        const afterModify = JSON.stringify(events);
        console.log("[updateEvent] Before save size:", beforeSave.length, "After modify size:", afterModify.length);

        try {
          localStorage.setItem("connection-room:custom-events", afterModify);
          const verified = localStorage.getItem("connection-room:custom-events");
          console.log("[updateEvent] Verified in localStorage:", verified === afterModify ? "YES" : "NO - DATA MISMATCH!");
          console.log("[updateEvent] Successfully saved to localStorage");
        } catch (e) {
          console.error("[updateEvent] FAILED TO SAVE TO LOCALSTORAGE:", e);
        }
      } else {
        console.error("[updateEvent] EVENT NOT FOUND IN LOCALSTORAGE - IDs available:", events.map((e: Event) => e.id));
      }
    }
  } catch (err) {
    console.warn("[updateEvent] Could not cache event in localStorage:", err instanceof Error ? err.message : err);
  }

  // Sync the change to Workshop Ops if the event was successfully updated.
  // Cancelling always removes the workshop over there rather than updating
  // it (a cancelled event, if it still passed the location-type check
  // below, would otherwise send a confusing "update" right before removal).
  if (updatedEvent && updatedEvent.startAt) {
    if (updatedEvent.status === "cancelled") {
      if (updatedEvent.workshopId || shouldSyncEventToWorkshopOps(updatedEvent.locationType)) {
        console.log(`[updateEvent] Event cancelled -- removing its workshop from Workshop Ops (${updatedEvent.id})`);
        fireWorkshopDeletionWebhook(updatedEvent.id);
      }
    } else {
      const shouldSync = shouldSyncEventToWorkshopOps(updatedEvent.locationType);
      const { dateString, startTime, endTime } = toWorkshopDateTimeFields(updatedEvent.startAt, updatedEvent.endAt);

      if (shouldSync && !updatedEvent.workshopId) {
        // Location type just changed to in-person/hybrid and no workshop
        // exists yet on Workshop Ops -- create one now instead of updating.
        const creationPayload: WorkshopCreationPayload = {
          eventId: updatedEvent.id,
          eventTitle: updatedEvent.title,
          eventDate: dateString,
          startTime,
          endTime,
          location: updatedEvent.locationName || updatedEvent.locationAddress,
          description: updatedEvent.description || updatedEvent.shortDescription,
        };

        const handleWorkshopResponse = async (workshopData: WorkshopCreationResponse) => {
          if (supabase) {
            try {
              await supabase
                .from("events")
                .update({
                  workshop_id: workshopData.workshopId,
                  checkin_url: workshopData.checkinUrl,
                  feedback_url: workshopData.feedbackUrl,
                })
                .eq("id", updatedEvent!.id);
            } catch (err) {
              console.warn("[updateEvent] Could not save new workshop data:", err);
            }
          }
        };

        console.log("[updateEvent] Event now qualifies for Workshop Ops but has no workshop yet -- creating one:", updatedEvent.id);
        fireWorkshopCreationWebhook(creationPayload, handleWorkshopResponse);
      } else if (shouldSync && updatedEvent.workshopId) {
        const workshopPayload: WorkshopUpdatePayload = {
          eventId: updatedEvent.id,
          eventTitle: updatedEvent.title,
          eventDate: dateString,
          startTime,
          endTime,
          location: updatedEvent.locationName || updatedEvent.locationAddress,
          description: updatedEvent.description || updatedEvent.shortDescription,
        };

        console.log("[updateEvent] Firing workshop update webhook for event", updatedEvent.id);
        fireWorkshopUpdateWebhook(workshopPayload);
      } else if (!shouldSync && updatedEvent.workshopId) {
        // Switched to online -- the workshop should no longer exist on
        // Workshop Ops.
        console.log("[updateEvent] Event switched to online -- removing its workshop from Workshop Ops:", updatedEvent.id);
        fireWorkshopDeletionWebhook(updatedEvent.id);
      }
    }
  }

  console.log("[updateEvent] Returning updated event:", updatedEvent ? updatedEvent.id : "null");
  return updatedEvent;
}

// Delete event
export async function deleteEvent(id: string): Promise<boolean> {
  // Get the event before deleting so we can retrieve workshopId
  let eventToDelete: Event | null = null;

  try {
    eventToDelete = await getEvent(id);
  } catch (err) {
    console.warn("[deleteEvent] Could not fetch event before deletion:", err);
  }

  let deletedFromSupabase = false;

  try {
    if (supabase) {
      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) throw error;
      deletedFromSupabase = true;
      console.log("[deleteEvent] Successfully deleted from Supabase:", id);
    }
  } catch (err) {
    console.error("[deleteEvent] Error deleting from Supabase:", err);
  }

  // Always also delete from localStorage (even if Supabase succeeded)
  try {
    if (typeof window !== "undefined") {
      const events = JSON.parse(localStorage.getItem("connection-room:custom-events") || "[]");
      const filtered = events.filter((e: Event) => e.id !== id);

      if (filtered.length < events.length) {
        localStorage.setItem("connection-room:custom-events", JSON.stringify(filtered));
        console.log("[deleteEvent] Successfully deleted from localStorage:", id);
      }
    }
  } catch (err) {
    console.error("[deleteEvent] Error deleting from localStorage:", err);
  }

  // Fire deletion webhook after successful deletion -- only when a workshop
  // could plausibly exist over there (online-only events are never synced).
  if (eventToDelete) {
    if (eventToDelete.workshopId || shouldSyncEventToWorkshopOps(eventToDelete.locationType)) {
      console.log(`[deleteEvent] Firing workshop deletion webhook for event ${id}`);
      fireWorkshopDeletionWebhook(id);
    }

    if (eventToDelete.onlineUrl) {
      deleteZoomMeetingForEvent(eventToDelete.onlineUrl);
    }
  }

  // Return true if deleted from at least one source
  return deletedFromSupabase || (typeof window !== "undefined");
}

// Cancel event: sets status to "cancelled" (keeps the record here, unlike
// deleteEvent) and removes the matching workshop from Workshop Ops, if one
// exists there. updateEvent() handles the actual Workshop Ops call once
// status is "cancelled".
export async function cancelEvent(id: string): Promise<Event | null> {
  return updateEvent(id, { status: "cancelled" });
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
    workshopId: dbEvent.workshop_id,
    checkinUrl: dbEvent.checkin_url,
    feedbackUrl: dbEvent.feedback_url,
  };
}

function mapEventToDb(event: Partial<Event>): any {
  return {
    id: event.id || `event-${Date.now()}`,
    title: event.title,
    slug: event.slug,
    subtitle: event.subtitle,
    description: event.description,
    short_description: event.shortDescription,
    event_type: event.eventType,
    status: event.status,
    visibility: event.visibility,
    date: event.startAt || new Date().toISOString(),
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
    workshop_id: event.workshopId,
    checkin_url: event.checkinUrl,
    feedback_url: event.feedbackUrl,
  };
}
