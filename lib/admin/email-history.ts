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
