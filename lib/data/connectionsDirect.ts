// Data-access layer for the simplified "Say Hello" Connections flow
// (migration 096). Kept separate from lib/data/connectionAsync.ts --
// that file is the 37-function surface for the Guided Exchange
// round/reveal/live-session lifecycle; this is a small, purpose-built
// wrapper around a single new RPC plus reads for the connections it
// creates, following the exact same "thin typed wrapper, RPC does the
// real authorization" convention documented at the top of that file.

import { supabase } from "@/lib/supabase/client";
import { demoSafeWrite } from "@/lib/demo/demo-mode-guard";

export type DirectoryFilter = "everyone" | "near_me" | "new_members" | "shared_interests";

export interface DirectoryMember {
  id: string;
  displayName: string;
  profilePhoto: string;
  ageRange: string | null;
  location: string | null;
  tagline: string | null;
  interests: string[];
  connectionIntentions: string[];
  sharedInterestCount: number;
}

async function getAuthHeader(): Promise<Record<string, string> | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

// Backed by /api/connections/directory -- a real server-side query (blocks,
// suspensions, show_in_discovery all enforced there), not a client-side
// filter over data a member could otherwise just SELECT themselves.
export async function getConnectionsDirectory(
  filter: DirectoryFilter,
  page: number = 1
): Promise<{ members: DirectoryMember[]; hasMore: boolean; nearMeUnavailable?: boolean; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { members: [], hasMore: false, error: "Not signed in." };
  }

  const response = await fetch(`/api/connections/directory?filter=${filter}&page=${page}`, {
    headers: authHeader,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    return { members: [], hasMore: false, error: data.error || "Could not load members." };
  }
  return { members: data.members || [], hasMore: !!data.hasMore, nearMeUnavailable: !!data.nearMeUnavailable };
}

export interface ConnectionSuggestion {
  id: string;
  displayName: string;
  profilePhoto: string;
  reason: string;
}

// Backed by /api/connections/suggestions -- "Someone You Might Want to
// Know" (weekly=false, up to 3) or "Your Connection of the Week"
// (weekly=true, deterministic pick for the current ISO week).
export async function getConnectionSuggestions(
  weekly: boolean = false
): Promise<{ suggestions: ConnectionSuggestion[]; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) return { suggestions: [], error: "Not signed in." };

  const response = await fetch(`/api/connections/suggestions?weekly=${weekly}`, {
    headers: authHeader,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    return { suggestions: [], error: data.error || "Could not load suggestions." };
  }
  return { suggestions: data.suggestions || [] };
}

// "Not this one" -- direct client write (RLS already scopes this to the
// caller's own rows, migration 097), same pattern as other
// owner-writes-their-own-preference tables in this codebase. Upserts so a
// repeat dismissal of the same person just refreshes the timestamp rather
// than erroring on the UNIQUE constraint.
export async function dismissSuggestion(dismissedUserId: string): Promise<boolean> {
  if (!supabase) return false;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;

  const { error } = await demoSafeWrite(
    () =>
      supabase!.from("connection_suggestion_dismissals").upsert(
        { user_id: userId, dismissed_user_id: dismissedUserId, dismissed_at: new Date().toISOString() },
        { onConflict: "user_id,dismissed_user_id" }
      ),
    { context: "dismissSuggestion" }
  );

  if (error) {
    console.error("[connectionsDirect] dismissSuggestion:", error);
    return false;
  }
  return true;
}

export interface SayHelloResult {
  connectionId: string | null;
  // The RPC raises a real exception for "blocked", "yourself", "empty
  // message", or not-authenticated -- surfaced here so the compose UI can
  // show the member something other than a silently-failed button.
  error: string | null;
}

// Creates (or reuses an already-open) connection between the caller and
// `toUserId`, and either delivers `messageText` immediately or holds it
// until the recipient accepts, depending on THEIR messaging_privacy
// preference -- see migration 096's say_hello() for the actual branching
// logic; this function does not need to know which path was taken.
export async function sayHello(toUserId: string, messageText: string): Promise<SayHelloResult> {
  if (!supabase) return { connectionId: null, error: "Connections are not available right now." };

  try {
    const { data, error } = await demoSafeWrite(
      () => supabase!.rpc("say_hello", { p_to_user_id: toUserId, p_message_text: messageText }),
      { context: "sayHello" }
    );

    if (error) {
      console.error("[connectionsDirect] sayHello:", error);
      return { connectionId: null, error: error.message || "Could not send this message." };
    }
    return { connectionId: data as string, error: null };
  } catch (err) {
    console.error("[connectionsDirect] sayHello:", err);
    return { connectionId: null, error: err instanceof Error ? err.message : "Could not send this message." };
  }
}
