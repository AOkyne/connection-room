import { supabase } from "@/lib/supabase/client";

export interface SentEmail {
  id: string;
  category: string;
  to_email: string;
  cc_email: string | null;
  subject: string;
  sent_at: string;
}

async function getAuthHeader(): Promise<Record<string, string> | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export async function getEmailHistory(params: {
  page?: number;
  category?: string;
  search?: string;
}): Promise<{ emails: SentEmail[]; total: number; page: number; pageSize: number; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { emails: [], total: 0, page: 1, pageSize: 50, error: "Not signed in with a real admin account." };
  }

  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.category) query.set("category", params.category);
  if (params.search) query.set("search", params.search);

  const response = await fetch(`/api/admin/email-history?${query.toString()}`, { headers: authHeader });
  const data = await response.json();
  if (!response.ok) {
    return { emails: [], total: 0, page: 1, pageSize: 50, error: data.error || "Request failed" };
  }
  return {
    emails: data.emails || [],
    total: data.total || 0,
    page: data.page || 1,
    pageSize: data.pageSize || 50,
  };
}

export interface BroadcastCampaign {
  batchId: string;
  subject: string;
  sentAt: string;
  totalSent: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRate: number;
  clickRate: number;
}

// Broadcasts sent before migration 095 shipped tracking have no
// broadcast_batch_id and simply won't appear here -- there's nothing to
// group them into, and no historical open/click data exists for them.
export async function getBroadcastCampaigns(): Promise<{ campaigns: BroadcastCampaign[]; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { campaigns: [], error: "Not signed in with a real admin account." };
  }

  const response = await fetch("/api/admin/broadcast-campaigns", { headers: authHeader, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) {
    return { campaigns: [], error: data.error || "Request failed" };
  }
  return { campaigns: data.campaigns || [] };
}

export interface UnsentRecipient {
  id: string;
  displayName: string;
}

// For a broadcast that got cut short partway through -- who among real
// members does NOT yet have a sent_emails row for this specific batch.
export async function getUnsentRecipients(
  batchId: string
): Promise<{ unsent: UnsentRecipient[]; totalMembers: number; alreadySentCount: number; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { unsent: [], totalMembers: 0, alreadySentCount: 0, error: "Not signed in with a real admin account." };
  }

  const response = await fetch(`/api/admin/broadcast-campaigns/${batchId}/unsent-recipients`, {
    headers: authHeader,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    return { unsent: [], totalMembers: 0, alreadySentCount: 0, error: data.error || "Request failed" };
  }
  return { unsent: data.unsent || [], totalMembers: data.totalMembers || 0, alreadySentCount: data.alreadySentCount || 0 };
}

export interface BroadcastCampaignContent {
  subject: string;
  // null for broadcasts sent before their content was saved (migration 103).
  bodyHtml: string | null;
  recipientIds: string[];
}

// "Use again": a past broadcast's subject, body (when saved) and the
// members it went to, ready to load back into the composer.
export async function getBroadcastCampaignContent(
  batchId: string
): Promise<{ content: BroadcastCampaignContent | null; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { content: null, error: "Not signed in with a real admin account." };
  }

  const response = await fetch(`/api/admin/broadcast-campaigns/${batchId}/content`, {
    headers: authHeader,
    cache: "no-store",
  });
  const raw = await response.text();
  let data: any = null;
  try {
    data = JSON.parse(raw);
  } catch {
    // Non-JSON (e.g. a platform error page) -- handled below.
  }
  if (!response.ok || !data) {
    return { content: null, error: data?.error || `Request failed (${response.status})` };
  }
  return { content: { subject: data.subject || "", bodyHtml: data.bodyHtml ?? null, recipientIds: data.recipientIds || [] } };
}
