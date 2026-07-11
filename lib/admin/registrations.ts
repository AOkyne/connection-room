import { supabase } from "@/lib/supabase/client";

const REGISTRATIONS_STORAGE_KEY = "connection-room:event-registrations";

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  name: string;
  email: string;
  status: "registered" | "attended" | "cancelled";
  registeredAt: string;
}

// Register user for an event
export async function registerForEvent(
  eventId: string,
  userId: string,
  name: string,
  email: string
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

    return data as EventRegistration;
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
      return registration;
    } catch (e) {
      console.error("localStorage registration failed:", e);
      return null;
    }
  }
}

// Cancel registration
export async function cancelRegistration(
  eventId: string,
  userId: string
): Promise<boolean> {
  try {
    // Try Supabase first
    const { error } = await supabase
      .from("event_registrations")
      .update({ status: "cancelled" })
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase cancellation failed, falling back to localStorage:", err);

    // Fallback to localStorage
    if (typeof window === "undefined") return false;

    try {
      const existing = JSON.parse(localStorage.getItem(REGISTRATIONS_STORAGE_KEY) || "[]");
      const updated = existing.map((reg: EventRegistration) =>
        reg.eventId === eventId && reg.userId === userId
          ? { ...reg, status: "cancelled" }
          : reg
      );
      localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error("localStorage cancellation failed:", e);
      return false;
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
