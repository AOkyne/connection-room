import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { queueEventRegistrationsWebhook, type WorkshopRegistration } from "@/lib/webhooks/workshop-webhook";

const REGISTRATIONS_STORAGE_KEY = "connection-room:event-registrations";

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  name: string;
  email: string;
  status: "registered" | "interested" | "attended" | "cancelled";
  registeredAt: string;
}

// Supabase returns snake_case columns; map to the camelCase interface above
function mapRegistrationFromDb(row: any): EventRegistration {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.profile_id,
    name: row.name,
    email: row.email,
    status: row.status,
    registeredAt: row.registered_at,
  };
}

// Register user for an event
export async function registerForEvent(
  eventId: string,
  userId: string,
  name: string,
  email: string,
  eventTitle: string = "",
  eventDate: string = ""
): Promise<EventRegistration | null> {
  try {
    // Try Supabase first
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");

    // Upsert, not insert: a user may already have a row for this event (e.g. they
    // marked interested first), and event_id+profile_id is unique. A plain insert
    // would fail with a duplicate key error in that case.
    const { data, error } = await supabase
      .from("event_registrations")
      .upsert(
        {
          event_id: eventId,
          profile_id: userId,
          name,
          email,
          status: "registered",
          registered_at: new Date().toISOString(),
        },
        { onConflict: "event_id,profile_id" }
      )
      .select()
      .single();

    if (error) throw error;

    const registration = mapRegistrationFromDb(data);

    // Send webhook to workshop ops app if eventDate is provided
    if (eventDate) {
      console.log(`[registerForEvent] Supabase success, triggering webhook sync for event ${eventId}`);
      await syncEventRegistrationsToWorkshop(eventId, eventTitle, eventDate);
    } else {
      console.warn(`[registerForEvent] No eventDate provided, skipping webhook`);
    }

    return registration;
  } catch (err) {
    console.warn("Supabase registration failed, falling back to localStorage:", err);

    // Fallback to localStorage
    if (typeof window === "undefined") return null;

    const registration: EventRegistration = {
      id: `reg-${Date.now()}-${Math.random()}`,
      eventId,
      userId,
      name,
      email,
      status: "registered",
      registeredAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem(REGISTRATIONS_STORAGE_KEY) || "[]");
      const updated = [...existing, registration];
      localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(updated));

      console.log(`[registerForEvent] Saved registration to localStorage. Total registrations now:`, updated.length);
      console.log(`[registerForEvent] Saved registration:`, registration);

      // Send webhook even for localStorage registrations if eventDate is provided
      if (eventDate) {
        console.log(`[registerForEvent] localStorage fallback, triggering webhook sync. eventId=${eventId}, eventDate=${eventDate}`);
        console.log(`[registerForEvent] Calling syncEventRegistrationsToWorkshop now...`);
        await syncEventRegistrationsToWorkshop(eventId, eventTitle, eventDate);
        console.log(`[registerForEvent] syncEventRegistrationsToWorkshop completed`);
      } else {
        console.warn(`[registerForEvent] No eventDate provided on fallback, skipping webhook`);
      }

      return registration;
    } catch (e) {
      console.error("localStorage registration failed:", e);
      return null;
    }
  }
}

// Update registration status
export async function updateRegistrationStatus(
  eventId: string,
  userId: string,
  status: "registered" | "interested" | "attended" | "cancelled",
  eventTitle: string = "",
  name: string = "",
  email: string = "",
  eventDate: string = ""
): Promise<boolean> {
  try {
    // Try Supabase first
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");

    const { error } = await supabase
      .from("event_registrations")
      .update({ status })
      .eq("event_id", eventId)
      .eq("profile_id", userId);

    if (error) throw error;

    // Send webhook for status update if eventDate is provided
    if (eventDate) {
      await syncEventRegistrationsToWorkshop(eventId, eventTitle, eventDate);
    }

    return true;
  } catch (err) {
    console.warn(`Supabase status update failed, falling back to localStorage:`, err);

    // Fallback to localStorage
    if (typeof window === "undefined") return false;

    try {
      const existing = JSON.parse(localStorage.getItem(REGISTRATIONS_STORAGE_KEY) || "[]");
      const updated = existing.map((reg: EventRegistration) =>
        reg.eventId === eventId && reg.userId === userId
          ? { ...reg, status }
          : reg
      );
      localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(updated));

      // Send webhook for status update if eventDate is provided
      if (eventDate) {
        await syncEventRegistrationsToWorkshop(eventId, eventTitle, eventDate);
      }

      return true;
    } catch (e) {
      console.error("localStorage status update failed:", e);
      return false;
    }
  }
}

// Cancel registration (sets status to cancelled)
export async function cancelRegistration(
  eventId: string,
  userId: string,
  eventTitle: string = "",
  name: string = "",
  email: string = "",
  eventDate: string = ""
): Promise<boolean> {
  return updateRegistrationStatus(eventId, userId, "cancelled", eventTitle, name, email, eventDate);
}

// Mark as attended
export async function markAsAttended(
  eventId: string,
  userId: string,
  eventTitle: string = "",
  name: string = "",
  email: string = "",
  eventDate: string = ""
): Promise<boolean> {
  return updateRegistrationStatus(eventId, userId, "attended", eventTitle, name, email, eventDate);
}

// Mark as interested (without registering)
export async function markAsInterested(
  eventId: string,
  userId: string,
  name: string,
  email: string,
  eventTitle: string = "",
  eventDate: string = ""
): Promise<EventRegistration | null> {
  try {
    // Try Supabase first
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");

    const { data, error } = await supabase
      .from("event_registrations")
      .upsert(
        {
          event_id: eventId,
          profile_id: userId,
          name,
          email,
          status: "interested",
          registered_at: new Date().toISOString(),
        },
        { onConflict: "event_id,profile_id" }
      )
      .select()
      .single();

    if (error) throw error;

    const registration = mapRegistrationFromDb(data);

    // Send webhook for interest if eventDate is provided
    if (eventDate) {
      await syncEventRegistrationsToWorkshop(eventId, eventTitle, eventDate);
    }

    return registration;
  } catch (err) {
    console.warn("Supabase interested update failed, falling back to localStorage:", err);

    // Fallback to localStorage
    if (typeof window === "undefined") return null;

    try {
      const existing = JSON.parse(localStorage.getItem(REGISTRATIONS_STORAGE_KEY) || "[]");
      const index = existing.findIndex(
        (reg: EventRegistration) => reg.eventId === eventId && reg.userId === userId
      );

      const registeredAt = new Date().toISOString();
      const registration: EventRegistration = {
        id: index >= 0 ? existing[index].id : `reg-${Date.now()}-${Math.random()}`,
        eventId,
        userId,
        name,
        email,
        status: "interested",
        registeredAt,
      };

      if (index >= 0) {
        existing[index] = registration;
      } else {
        existing.push(registration);
      }

      localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(existing));

      // Send webhook for interest if eventDate is provided
      if (eventDate) {
        await syncEventRegistrationsToWorkshop(eventId, eventTitle, eventDate);
      }

      return registration;
    } catch (e) {
      console.error("localStorage interested update failed:", e);
      return null;
    }
  }
}

// Get event registrations (admin)
export async function getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
  try {
    // Try Supabase first
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");

    const { data, error } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("event_id", eventId)
      .neq("status", "cancelled");

    if (error) throw error;
    return (data || []).map(mapRegistrationFromDb);
  } catch (err) {
    console.warn("Supabase registration fetch failed, falling back to localStorage:", err);

    // Fallback to localStorage
    if (typeof window === "undefined") return [];

    console.log(`[getEventRegistrations] Starting localStorage fallback for eventId: ${eventId}`);
    try {
      const existing = JSON.parse(localStorage.getItem(REGISTRATIONS_STORAGE_KEY) || "[]");
      console.log(`[getEventRegistrations] Parsed localStorage successfully. Found ${existing.length} registrations`);
      console.log(`[getEventRegistrations] All registrations in localStorage:`, existing);
      console.log(`[getEventRegistrations] Looking for eventId: ${eventId}`);

      console.log(`[getEventRegistrations] Starting filter loop...`);
      const filtered = existing.filter(
        (reg: EventRegistration) => {
          const matches = reg.eventId === eventId && reg.status !== "cancelled";
          console.log(`[getEventRegistrations] Checking reg:`, { eventId: reg.eventId, status: reg.status, matches });
          return matches;
        }
      );
      console.log(`[getEventRegistrations] Filtered registrations for ${eventId}:`, filtered);
      console.log(`[getEventRegistrations] Filtered count: ${filtered.length}`);
      return filtered;
    } catch (e) {
      console.error("localStorage registration fetch failed:", e);
      return [];
    }
  }
}

// Get user's registrations
export async function getUserRegistrations(userId: string): Promise<EventRegistration[]> {
  try {
    // Try Supabase first
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");

    const { data, error } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("profile_id", userId)
      .neq("status", "cancelled");

    if (error) throw error;
    return (data || []).map(mapRegistrationFromDb);
  } catch (err) {
    console.warn("Supabase user registrations fetch failed, falling back to localStorage:", err);

    // Fallback to localStorage
    if (typeof window === "undefined") return [];

    try {
      const existing = JSON.parse(localStorage.getItem(REGISTRATIONS_STORAGE_KEY) || "[]");
      return existing.filter(
        (reg: EventRegistration) => reg.userId === userId && reg.status !== "cancelled"
      );
    } catch (e) {
      console.error("localStorage user registrations fetch failed:", e);
      return [];
    }
  }
}

// Check if user is registered for event
export async function isRegisteredForEvent(eventId: string, userId: string): Promise<boolean> {
  const registrations = await getUserRegistrations(userId);
  return registrations.some((reg) => reg.eventId === eventId);
}

// Get registration counts by status for an event (admin)
export async function getEventRegistrationStats(eventId: string): Promise<{
  registered: number;
  interested: number;
  attended: number;
  cancelled: number;
}> {
  const allRegistrations = await getEventRegistrations(eventId);

  return {
    registered: allRegistrations.filter((r) => r.status === "registered").length,
    interested: allRegistrations.filter((r) => r.status === "interested").length,
    attended: allRegistrations.filter((r) => r.status === "attended").length,
    cancelled: allRegistrations.filter(
      (r) => r.status === "cancelled" || (r as any).status === "cancelled"
    ).length,
  };
}

// Send event registrations to workshop ops via webhook
export async function syncEventRegistrationsToWorkshop(
  eventId: string,
  eventTitle: string,
  eventDate: string
): Promise<boolean> {
  try {
    // Registrations now write to Supabase successfully (see getEventRegistrations),
    // so that's the source of truth. Fall back to localStorage only if that fails,
    // matching the same fallback pattern the rest of this file uses.
    let workshopRegistrations: WorkshopRegistration[] = [];

    try {
      const regs = await getEventRegistrations(eventId);
      workshopRegistrations = regs.map((reg) => ({
        id: reg.id,
        name: reg.name,
        email: reg.email,
        status: reg.status,
        registeredAt: reg.registeredAt,
      }));
      console.log(`[syncEventRegistrationsToWorkshop] Found ${workshopRegistrations.length} active registrations in Supabase for event ${eventId}`);
    } catch (e) {
      console.warn(`[syncEventRegistrationsToWorkshop] Supabase fetch failed, falling back to localStorage:`, e);

      if (typeof window !== "undefined") {
        try {
          const allRegs = JSON.parse(localStorage.getItem(REGISTRATIONS_STORAGE_KEY) || "[]");
          const filtered = allRegs.filter(
            (reg: EventRegistration) => reg.eventId === eventId && reg.status !== "cancelled"
          );
          workshopRegistrations = filtered.map((reg: EventRegistration) => ({
            id: reg.id,
            name: reg.name,
            email: reg.email,
            status: reg.status,
            registeredAt: reg.registeredAt,
          }));
        } catch (e2) {
          console.error(`[syncEventRegistrationsToWorkshop] Error parsing localStorage:`, e2);
          return false;
        }
      }
    }

    console.log(`[syncEventRegistrationsToWorkshop] Syncing ${workshopRegistrations.length} registrations for event ${eventId}`);
    console.log(`[syncEventRegistrationsToWorkshop] Queueing webhook with payload:`, {
      eventId,
      eventTitle,
      eventDate,
      registrationCount: workshopRegistrations.length,
    });

    queueEventRegistrationsWebhook(eventId, eventTitle, eventDate, workshopRegistrations);
    return true;
  } catch (err) {
    console.error(`[syncEventRegistrationsToWorkshop] Error syncing registrations:`, err);
    return false;
  }
}

// Delete a registration (admin)
export async function deleteEventRegistration(registrationId: string): Promise<boolean> {
  try {
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");

    const { error } = await supabase
      .from("event_registrations")
      .delete()
      .eq("id", registrationId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase registration delete failed, falling back to localStorage:", err);

    if (typeof window === "undefined") return false;

    try {
      const existing = JSON.parse(localStorage.getItem(REGISTRATIONS_STORAGE_KEY) || "[]");
      const filtered = existing.filter((reg: EventRegistration) => reg.id !== registrationId);
      localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.error("localStorage registration delete failed:", e);
      return false;
    }
  }
}

// Get all registrations including cancelled (for admin view)
export async function getAllEventRegistrations(eventId: string): Promise<EventRegistration[]> {
  try {
    // Try Supabase first
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");

    const { data, error } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("event_id", eventId);

    if (error) throw error;
    return (data || []).map(mapRegistrationFromDb);
  } catch (err) {
    console.warn("Supabase all registrations fetch failed, falling back to localStorage:", err);

    // Fallback to localStorage
    if (typeof window === "undefined") return [];

    try {
      const existing = JSON.parse(localStorage.getItem(REGISTRATIONS_STORAGE_KEY) || "[]");
      return existing.filter((reg: EventRegistration) => reg.eventId === eventId);
    } catch (e) {
      console.error("localStorage all registrations fetch failed:", e);
      return [];
    }
  }
}
