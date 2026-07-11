import { supabase } from "@/lib/supabase/client";
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
    const { data, error } = await supabase
      .from("event_registrations")
      .insert({
        event_id: eventId,
        user_id: userId,
        name,
        email,
        status: "registered",
        registered_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    const registration = data as EventRegistration;

    // Send webhook to workshop ops app if eventDate is provided
    if (eventDate) {
      await syncEventRegistrationsToWorkshop(eventId, eventTitle, eventDate);
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

      // Send webhook even for localStorage registrations if eventDate is provided
      if (eventDate) {
        await syncEventRegistrationsToWorkshop(eventId, eventTitle, eventDate);
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
    const { error } = await supabase
      .from("event_registrations")
      .update({ status })
      .eq("event_id", eventId)
      .eq("user_id", userId);

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
    const { data, error } = await supabase
      .from("event_registrations")
      .upsert(
        {
          event_id: eventId,
          user_id: userId,
          name,
          email,
          status: "interested",
          registered_at: new Date().toISOString(),
        },
        { onConflict: "event_id,user_id" }
      )
      .select()
      .single();

    if (error) throw error;

    const registration = data as EventRegistration;

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
    const { data, error } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("event_id", eventId)
      .neq("status", "cancelled");

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Supabase registration fetch failed, falling back to localStorage:", err);

    // Fallback to localStorage
    if (typeof window === "undefined") return [];

    try {
      const existing = JSON.parse(localStorage.getItem(REGISTRATIONS_STORAGE_KEY) || "[]");
      return existing.filter(
        (reg: EventRegistration) => reg.eventId === eventId && reg.status !== "cancelled"
      );
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
    const { data, error } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "cancelled");

    if (error) throw error;
    return data || [];
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
  const registrations = await getEventRegistrations(eventId);

  const workshopRegistrations: WorkshopRegistration[] = registrations.map((reg) => ({
    id: reg.id,
    name: reg.name,
    email: reg.email,
    status: reg.status,
    registeredAt: reg.registeredAt,
  }));

  queueEventRegistrationsWebhook(eventId, eventTitle, eventDate, workshopRegistrations);
  return true;
}

// Get all registrations including cancelled (for admin view)
export async function getAllEventRegistrations(eventId: string): Promise<EventRegistration[]> {
  try {
    // Try Supabase first
    const { data, error } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("event_id", eventId);

    if (error) throw error;
    return data || [];
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
