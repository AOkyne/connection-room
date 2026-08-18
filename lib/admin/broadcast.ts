import { supabase } from "@/lib/supabase/client";

export interface SendBroadcastEmailResult {
  sentCount: number;
  failedCount: number;
  errors: string[];
  // Explicit, unambiguous success signal -- previously callers checked
  // failedCount === 0, but every early-error branch below (no session,
  // API error, network exception) hardcoded failedCount to 0 for "all"
  // recipient mode specifically, since this function has no way to know
  // the real recipient count without ever reaching the API. That made
  // EVERY failure while sending to "All Members" look like a false
  // success (a misleading "Email sent to 0 members" toast, the draft
  // deleted, the form cleared) with the real error never surfaced --
  // confirmed live as the cause of "I click Send and nothing happens"
  // (no email actually went out, but nothing looked wrong either).
  success: boolean;
}

export async function sendBroadcastEmail(
  recipientIds: string[] | "all",
  subject: string,
  bodyHtml: string
): Promise<SendBroadcastEmailResult> {
  try {
    const { data: sessionData } = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      return {
        sentCount: 0,
        failedCount: recipientIds === "all" ? 0 : recipientIds.length,
        errors: [
          "Not signed in with a real admin account. Admin actions require a real Supabase sign-in, not a demo session.",
        ],
        success: false,
      };
    }

    const response = await fetch("/api/admin/broadcast-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ recipientIds, subject, bodyHtml }),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        sentCount: 0,
        failedCount: recipientIds === "all" ? 0 : recipientIds.length,
        errors: [data.error || "Request failed"],
        success: false,
      };
    }

    const errors = (data.results || [])
      .filter((r: { success: boolean }) => !r.success)
      .map((r: { id: string; error?: string }) => `${r.id}: ${r.error || "unknown error"}`);

    return { sentCount: data.sentCount, failedCount: data.failedCount, errors, success: errors.length === 0 };
  } catch (err) {
    return {
      sentCount: 0,
      failedCount: recipientIds === "all" ? 0 : recipientIds.length,
      errors: [err instanceof Error ? err.message : "Failed to send"],
      success: false,
    };
  }
}
