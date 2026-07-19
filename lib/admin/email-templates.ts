import { supabase } from "@/lib/supabase/client";

export interface EmailTemplate {
  id: string;
  key: string;
  subject: string;
  body: string;
  sign_off: string;
  days_after_onboarding: number | null;
  days_after_signup_if_incomplete: number | null;
  active: boolean;
  updated_at: string;
}

async function getAuthHeader(): Promise<Record<string, string> | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export async function getEmailTemplates(): Promise<{ templates: EmailTemplate[]; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { templates: [], error: "Not signed in with a real admin account." };
  }

  const response = await fetch("/api/admin/email-templates", { headers: authHeader });
  const data = await response.json();
  if (!response.ok) {
    return { templates: [], error: data.error || "Request failed" };
  }
  return { templates: data.templates || [] };
}

export async function updateEmailTemplate(
  id: string,
  updates: { subject?: string; body?: string; sign_off?: string; active?: boolean }
): Promise<{ template?: EmailTemplate; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { error: "Not signed in with a real admin account." };
  }

  const response = await fetch("/api/admin/email-templates", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify({ id, ...updates }),
  });
  const data = await response.json();
  if (!response.ok) {
    return { error: data.error || "Request failed" };
  }
  return { template: data.template };
}
