import { supabase } from "@/lib/supabase/client";

async function getAuthHeader(): Promise<Record<string, string> | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export interface ConnectionsOverview {
  totalConnections: number;
  statusCounts: Record<string, number>;
  pendingReportsCount: number;
  stuckRounds: { connectionId: string; roundNumber: number; deadlineMissedAt: string; participants: [string, string] }[];
  liveSessions: {
    counts: Record<string, number>;
    upcoming: { connectionId: string; scheduledStartAt: string; participants: [string, string] }[];
  };
  recent: {
    id: string;
    participants: [string, string];
    status: string;
    connectionType: string;
    currentRoundNumber: number;
    createdAt: string;
    isReported: boolean;
  }[];
}

export async function getConnectionsOverview(): Promise<{ overview: ConnectionsOverview | null; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { overview: null, error: "Not signed in with a real admin account." };
  }

  const response = await fetch("/api/admin/connections/overview", { headers: authHeader, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) {
    return { overview: null, error: data.error || "Request failed" };
  }
  return { overview: data };
}

export interface ConnectionContent {
  connection: {
    id: string;
    status: string;
    connectionType: string;
    createdAt: string;
    participants: [string, string];
  } | null;
  reports: { id: string; reason: string; severity: string; status: string; adminNotes: string | null; createdAt: string }[];
  rounds: {
    id: string;
    roundNumber: number;
    status: string;
    promptText: string | null;
    revealedAt: string | null;
    responses: { name: string; text: string | null; submittedAt: string | null }[];
  }[];
  messages: { id: string; fromName: string; text: string; createdAt: string }[];
}

// Only succeeds for a connection that's actually been reported -- the API
// route itself enforces this (403 otherwise), this is just the client-side
// fetch wrapper.
export async function getConnectionContent(connectionId: string): Promise<{ content: ConnectionContent | null; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { content: null, error: "Not signed in with a real admin account." };
  }

  const response = await fetch(`/api/admin/connections/${connectionId}/content`, { headers: authHeader, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) {
    return { content: null, error: data.error || "Request failed" };
  }
  return { content: data };
}
