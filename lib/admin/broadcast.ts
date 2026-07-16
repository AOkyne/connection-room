import { supabase } from "@/lib/supabase/client";

export async function sendBroadcastEmail(
  recipientIds: string[] | "all",
  subject: string,
  bodyHtml: string
): Promise<{ sentCount: number; failedCount: number; errors: string[] }> {
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
      };
    }

    const errors = (data.results || [])
      .filter((r: { success: boolean }) => !r.success)
      .map((r: { id: string; error?: string }) => `${r.id}: ${r.error || "unknown error"}`);

    return { sentCount: data.sentCount, failedCount: data.failedCount, errors };
  } catch (err) {
    return {
      sentCount: 0,
      failedCount: recipientIds === "all" ? 0 : recipientIds.length,
      errors: [err instanceof Error ? err.message : "Failed to send"],
    };
  }
}
