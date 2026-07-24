import { supabase } from "@/lib/supabase/client";

export interface BroadcastDraft {
  id: string;
  subject: string;
  body_html: string;
  recipient_mode: "all" | "select";
  recipient_ids: string[];
  created_at: string;
  updated_at: string;
}

async function getAuthHeader(): Promise<Record<string, string> | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function listBroadcastDrafts(): Promise<{ drafts: BroadcastDraft[]; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) return { drafts: [], error: "Not signed in with a real admin account." };

  const response = await fetch("/api/admin/broadcast-drafts", { headers: authHeader });
  const data = await response.json();
  if (!response.ok) return { drafts: [], error: data.error || "Request failed" };
  return { drafts: data.drafts || [] };
}

export async function createBroadcastDraft(params: {
  subject: string;
  bodyHtml: string;
  recipientMode: "all" | "select";
  recipientIds: string[];
}): Promise<{ draft?: BroadcastDraft; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) return { error: "Not signed in with a real admin account." };

  const response = await fetch("/api/admin/broadcast-drafts", {
    method: "POST",
    headers: authHeader,
    body: JSON.stringify(params),
  });
  const data = await response.json();
  if (!response.ok) return { error: data.error || "Request failed" };
  return { draft: data.draft };
}

export async function updateBroadcastDraft(
  id: string,
  params: { subject: string; bodyHtml: string; recipientMode: "all" | "select"; recipientIds: string[] }
): Promise<{ draft?: BroadcastDraft; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) return { error: "Not signed in with a real admin account." };

  const response = await fetch(`/api/admin/broadcast-drafts/${id}`, {
    method: "PATCH",
    headers: authHeader,
    body: JSON.stringify(params),
  });
  const data = await response.json();
  if (!response.ok) return { error: data.error || "Request failed" };
  return { draft: data.draft };
}

export async function deleteBroadcastDraft(id: string): Promise<{ success: boolean; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) return { success: false, error: "Not signed in with a real admin account." };

  const response = await fetch(`/api/admin/broadcast-drafts/${id}`, {
    method: "DELETE",
    headers: authHeader,
  });
  const data = await response.json();
  if (!response.ok) return { success: false, error: data.error || "Request failed" };
  return { success: true };
}
