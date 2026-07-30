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
// History remains localStorage -- out of scope for this pass. Preferences
// and blocked-users now hit the real backend (migration 078): preferences
// previously only ever round-tripped through a localStorage key, so a
// member's frequency/contact-mode choice on one device was invisible to
// the async-matching/invitation RPCs running server-side; blocking was the
// same problem but worse -- a security requirement ("blocked users must
// not be matched or reconnected") that a client-only localStorage list
// can't actually enforce. See lib/data/connectionAsync.ts for the RPCs that
// depend on both being real now.

import { supabase } from "@/lib/supabase/client";
import { demoSafeWrite } from "@/lib/demo/demo-mode-guard";
import { getPublicProfile } from "./profiles";
import type { ConnectionRequest } from "./connectionRequests";
import type { ConnectionFormat } from "@/lib/types/connection";

export interface ConnectionPreferences {
  frequency: "weekly" | "monthly" | "pause";
  contactMode: "text" | "voice-video" | "local";
  optInToExchangeContact: boolean;
  formats: ConnectionFormat[];
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

const CURRENT_CONNECTION_KEY = "connection-room:current-connection";
const HISTORY_STORAGE_KEY = "connection-room:connection-history";

const DEFAULT_PREFERENCES: ConnectionPreferences = {
  frequency: "weekly",
  contactMode: "text",
  optInToExchangeContact: false,
  formats: ["guided_message"],
};

// Real `connection_preferences` row (migration 010 table, migration 078
// `formats` column) -- see file header for why this stopped being
// localStorage-only.
export async function getConnectionPreferences(userId: string): Promise<ConnectionPreferences> {
  if (!supabase) return DEFAULT_PREFERENCES;

  const { data, error } = await supabase
    .from("connection_preferences")
    .select("frequency, contact_mode, opt_in_to_exchange_contact, formats")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return DEFAULT_PREFERENCES;

  return {
    frequency: data.frequency || "weekly",
    contactMode: data.contact_mode || "text",
    optInToExchangeContact: data.opt_in_to_exchange_contact || false,
    formats: (data.formats && data.formats.length > 0 ? data.formats : ["guided_message"]) as ConnectionFormat[],
  };
}

export async function updateConnectionPreferences(userId: string, preferences: ConnectionPreferences): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await demoSafeWrite(
    () =>
      supabase!.from("connection_preferences").upsert(
        {
          user_id: userId,
          frequency: preferences.frequency,
          contact_mode: preferences.contactMode,
          opt_in_to_exchange_contact: preferences.optInToExchangeContact,
          formats: preferences.formats,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      ),
    { context: "updateConnectionPreferences" }
  );

  if (error) {
    console.error("Error updating connection preferences:", error);
    return false;
  }
  return true;
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

// Block a user -- real `connection_blocks` row (migration 078). Previously
// localStorage-only, which meant the async-invitation RPCs (and the legacy
// matching route) had no way to actually enforce a block server-side; see
// file header.
export async function blockUser(_userId: string, blockedUserId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await demoSafeWrite(
    () => supabase!.from("connection_blocks").insert({ blocker_id: _userId, blocked_id: blockedUserId }),
    { context: "blockUser" }
  );

  // A duplicate block (unique constraint) is not an error worth surfacing.
  if (error && !String(error.message || "").includes("duplicate")) {
    console.error("Error blocking user:", error);
    return false;
  }
  return true;
}

// Get blocked users
export async function getBlockedUsers(userId: string): Promise<Set<string>> {
  if (!supabase) return new Set();

  const { data, error } = await supabase.from("connection_blocks").select("blocked_id").eq("blocker_id", userId);

  if (error) {
    console.error("Error fetching blocked users:", error);
    return new Set();
  }

  return new Set((data || []).map((row) => row.blocked_id));
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
        // Explicit -- migration 078 changed connections.connection_type's
        // column default to 'async' (for the new invitation RPC, which
        // always sets it explicitly anyway). This legacy insert never set
        // it, so it was silently inheriting that default: every new
        // legacy-flow connection since then has been mislabeled
        // connection_type='async' with none of the actual async
        // infrastructure (no connection_participants, no
        // connection_rounds) -- a broken hybrid row that both
        // getActiveConnections() (filters connection_type='live') and the
        // Guided Connections dashboard would handle wrong. Confirmed live.
        connection_type: "live",
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
    // Scoped to connection_type='live' (migration 078) -- async guided
    // connections also pass through status 'active' once accepted, but they
    // have no connection_messages/ConnectionChat history and belong on the
    // Guided Connections dashboard instead. Without this filter, an
    // accepted async connection would also show up here as an empty,
    // message-less legacy chat, which is exactly the wrong place for it.
    const { data, error } = await supabase
      .from("connections")
      .select("*")
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq("connection_type", "live")
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
