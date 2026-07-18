// Connections data access layer.
//
// Confirmed/active connections are backed by the real `connections`
// Supabase table (migration 010, RLS already correct: either party can
// select, only the row's own user_id can insert/update). A single row
// (user_id = whoever accepted the request, partner_id = the requester)
// is enough for BOTH people to read/write via the RLS OR-check -- but
// only the row's user_id knows their own partner's name/photo without an
// extra lookup, so mapConnectionRow() below resolves the "partner" fields
// from whichever side the current viewer is on, fetching the other
// person's public profile when the viewer is partner_id rather than
// user_id.
//
// Preferences/history/declined/blocked lists remain localStorage --
// out of scope for the real-data pass that added the functions below.

import { supabase } from "@/lib/supabase/client";
import { getPublicProfile } from "./profiles";
import type { ConnectionRequest } from "./connectionRequests";

export interface ConnectionPreferences {
  frequency: "weekly" | "monthly" | "pause";
  contactMode: "text" | "voice-video" | "local";
  optInToExchangeContact: boolean;
}

export interface Connection {
  id: string;
  userId: string;
  partnerId: string;
  partnerName: string;
  partnerFirstName?: string;
  partnerLastName?: string;
  partnerPronouns?: string;
  partnerPhoto: string;
  partnerInterests: string[];
  partnerContactMode?: "text" | "voice-video" | "local";
  status: "pending_their_acceptance" | "confirmed" | "active" | "completed" | "declined";
  createdAt: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  sharedPrompt: string;
  mutualContactOptIn: boolean;
}

const PREFERENCES_STORAGE_KEY = "connection-room:connection-preferences";
const CURRENT_CONNECTION_KEY = "connection-room:current-connection";
const HISTORY_STORAGE_KEY = "connection-room:connection-history";

// Get connection preferences
export function getConnectionPreferences(userId: string): ConnectionPreferences {
  if (typeof window === "undefined") {
    return { frequency: "weekly", contactMode: "text", optInToExchangeContact: false };
  }

  const stored = localStorage.getItem(`${PREFERENCES_STORAGE_KEY}:${userId}`);
  if (stored) {
    return JSON.parse(stored);
  }

  return { frequency: "weekly", contactMode: "text", optInToExchangeContact: false };
}

// Update connection preferences
export function updateConnectionPreferences(userId: string, preferences: ConnectionPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PREFERENCES_STORAGE_KEY}:${userId}`, JSON.stringify(preferences));
}

// Get current connection
export function getCurrentConnection(userId: string): Connection | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(`${CURRENT_CONNECTION_KEY}:${userId}`);
  return stored ? JSON.parse(stored) : null;
}

// Save current connection
export function setCurrentConnection(userId: string, connection: Connection | null): void {
  if (typeof window === "undefined") return;

  if (connection) {
    localStorage.setItem(`${CURRENT_CONNECTION_KEY}:${userId}`, JSON.stringify(connection));
  } else {
    localStorage.removeItem(`${CURRENT_CONNECTION_KEY}:${userId}`);
  }
}

// Mark connection as complete
export function completeConnection(userId: string, connectionId: string): void {
  if (typeof window === "undefined") return;

  const connection = getCurrentConnection(userId);
  if (connection && connection.id === connectionId) {
    connection.status = "completed";
    connection.completedAt = new Date();
    setCurrentConnection(userId, connection);
  }
}

// Skip current connection
export function skipConnection(userId: string): void {
  if (typeof window === "undefined") return;
  setCurrentConnection(userId, null);
}

// Report a safety/behavior concern about a connection. Writes to the real
// `reports` table (migration 055) rather than localStorage -- previously
// this only ever wrote to a localStorage key, so a concern filed by a
// member was invisible to admins on any other device or browser.
export async function reportConnectionConcern(
  userId: string,
  connectionId: string,
  concern: string,
  severity: "low" | "medium" | "high" = "medium"
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase.from("reports").insert({
    reporter_id: userId,
    connection_id: connectionId,
    reason: concern,
    severity,
    status: "pending",
  });

  if (error) {
    console.error("Error reporting connection concern:", error);
    return false;
  }

  return true;
}

// Get a user's own reported concerns (safety). Reads the real `reports`
// table now that reportConnectionConcern() writes to it -- RLS already
// scopes this to the caller's own rows via "Users can read own reports"
// (reporter_id = auth.uid()), matching this function's intent.
export async function getSafetyReports(userId: string): Promise<any[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("reports")
    .select("id, reporter_id, connection_id, reason, severity, status, reviewed, admin_notes, created_at")
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching safety reports:", error);
    return [];
  }

  return data || [];
}

// Block a user
export function blockUser(userId: string, blockedUserId: string): void {
  if (typeof window === "undefined") return;

  const blockedKey = `connection-room:blocked-users:${userId}`;
  const blocked = JSON.parse(localStorage.getItem(blockedKey) || "[]");

  if (!blocked.includes(blockedUserId)) {
    blocked.push(blockedUserId);
    localStorage.setItem(blockedKey, JSON.stringify(blocked));
  }
}

// Get blocked users
export function getBlockedUsers(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();

  const blockedKey = `connection-room:blocked-users:${userId}`;
  const blocked = JSON.parse(localStorage.getItem(blockedKey) || "[]");
  return new Set(blocked);
}

// Get completed connection history
export function getConnectionHistory(userId: string): Connection[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(`${HISTORY_STORAGE_KEY}:${userId}`);
  return stored ? JSON.parse(stored) : [];
}

// Add connection to history when completed
export function addToConnectionHistory(userId: string, connection: Connection): void {
  if (typeof window === "undefined") return;

  const history = getConnectionHistory(userId);
  history.push({
    ...connection,
    status: "completed" as const,
  });

  localStorage.setItem(`${HISTORY_STORAGE_KEY}:${userId}`, JSON.stringify(history));
}

// Get all declined user IDs to avoid re-matching
export function getDeclinedUsers(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();

  const stored = localStorage.getItem(`connection-room:declined-users:${userId}`);
  const declined = stored ? JSON.parse(stored) : [];
  return new Set(declined);
}

// Add user to declined list
export function addToDeclinedUsers(userId: string, declinedUserId: string): void {
  if (typeof window === "undefined") return;

  const declined = Array.from(getDeclinedUsers(userId));
  if (!declined.includes(declinedUserId)) {
    declined.push(declinedUserId);
    localStorage.setItem(`connection-room:declined-users:${userId}`, JSON.stringify(declined));
  }
}

// Maps a real `connections` row into the Connection shape the UI expects,
// resolving "partner" from whichever side the viewer is on. If the viewer
// is the row's partner_id (i.e. they're viewing a connection the OTHER
// person accepted/created), the row has no field describing the viewer's
// own counterpart -- fetch the row owner's public profile instead.
async function mapConnectionRow(row: any, viewerId: string): Promise<Connection> {
  const viewerIsOwner = row.user_id === viewerId;

  let partnerId: string;
  let partnerName: string;
  let partnerFirstName: string | undefined;
  let partnerLastName: string | undefined;
  let partnerPronouns: string | undefined;
  let partnerPhoto: string;
  let partnerInterests: string[];

  if (viewerIsOwner) {
    partnerId = row.partner_id;
    partnerName = row.partner_name;
    partnerFirstName = row.partner_first_name || undefined;
    partnerLastName = row.partner_last_name || undefined;
    partnerPronouns = row.partner_pronouns || undefined;
    partnerPhoto = row.partner_photo || "";
    partnerInterests = row.partner_interests || [];
  } else {
    partnerId = row.user_id;
    const ownerProfile = await getPublicProfile(row.user_id);
    partnerName = ownerProfile?.displayName || "Member";
    partnerFirstName = ownerProfile?.firstName;
    partnerLastName = ownerProfile?.lastName;
    partnerPronouns = ownerProfile?.pronouns;
    partnerPhoto = ownerProfile?.profilePhoto || "";
    partnerInterests = ownerProfile?.interests || [];
  }

  return {
    id: row.id,
    userId: viewerId,
    partnerId,
    partnerName,
    partnerFirstName,
    partnerLastName,
    partnerPronouns,
    partnerPhoto,
    partnerInterests,
    status: row.status,
    createdAt: new Date(row.created_at),
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    sharedPrompt: row.shared_prompt || "",
    mutualContactOptIn: row.mutual_contact_opt_in || false,
  };
}

// Creates the real `connections` row when a request is accepted. The
// accepting user becomes the row's user_id (required by RLS -- only
// auth.uid() = user_id can insert); the original requester becomes
// partner_id, using the name/photo/interests already captured on their
// request.
export async function createConfirmedConnection(
  acceptingUserId: string,
  request: ConnectionRequest
): Promise<Connection | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("connections")
      .insert({
        user_id: acceptingUserId,
        partner_id: request.fromUserId,
        partner_name: request.fromUserName,
        partner_first_name: request.fromUserName.split(" ")[0],
        partner_last_name: request.fromUserName.split(" ").slice(1).join(" ") || null,
        partner_photo: request.fromUserPhoto || null,
        partner_interests: request.fromUserInterests || [],
        status: "confirmed",
        shared_prompt: request.sharedPrompt || null,
        confirmed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Error creating confirmed connection:", error);
      return null;
    }

    return mapConnectionRow(data, acceptingUserId);
  } catch (err) {
    console.error("Error creating confirmed connection:", err);
    return null;
  }
}

// Real, active (confirmed/active) connections for a member -- either side
// of the pairing. Drives the "Active Conversations" list; each returned
// Connection's `id` is a real `connections.id`, valid as the
// connection_messages foreign key ConnectionChat needs.
export async function getActiveConnections(userId: string): Promise<Connection[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("connections")
      .select("*")
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .in("status", ["confirmed", "active"])
      .order("confirmed_at", { ascending: false });

    if (error) {
      console.error("Error fetching active connections:", error);
      return [];
    }

    return Promise.all((data || []).map((row) => mapConnectionRow(row, userId)));
  } catch (err) {
    console.error("Error fetching active connections:", err);
    return [];
  }
}

// Best-effort sync of a status change (complete/skip) to the shared
// connections row. Only succeeds when the caller is the row's user_id --
// RLS restricts UPDATE to that (a schema constraint of the single-owner
// row model, not something this function can work around) -- so this can
// silently no-op for the non-owning side; callers should still update
// their own local view regardless of whether this succeeds.
export async function updateConnectionStatus(
  connectionId: string,
  status: "active" | "completed" | "declined"
): Promise<void> {
  if (!supabase) return;

  try {
    const updates: Record<string, unknown> = { status };
    if (status === "completed") updates.completed_at = new Date().toISOString();

    const { error } = await supabase.from("connections").update(updates).eq("id", connectionId);
    if (error) console.warn("Could not sync connection status (may not be the row owner):", error);
  } catch (err) {
    console.warn("Error syncing connection status:", err);
  }
}
