import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/require-admin";
import { hasSmtpConfig, sendBroadcastEmail } from "@/lib/email/send";

export const maxDuration = 60;

interface EmailResult {
  id: string;
  success: boolean;
  error?: string;
}

// Fetches every auth.users email, paginating past the 1000-per-page cap
// (see app/api/admin/members/emails/route.ts, which has the same limit but
// isn't used here since we need this server-side anyway for sending).
async function getEmailByUserId(supabase: SupabaseClient): Promise<Map<string, string>> {
  const emailByUserId = new Map<string, string>();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    for (const user of data.users) {
      if (user.email) emailByUserId.set(user.id, user.email);
    }

    if (data.users.length < perPage) break;
    page++;
  }

  return emailByUserId;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase } = auth;

  let body: { recipientIds?: unknown; subject?: unknown; bodyHtml?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { recipientIds, subject, bodyHtml } = body;
  const isAll = recipientIds === "all";
  if (
    (!isAll && (!Array.isArray(recipientIds) || recipientIds.length === 0 || !recipientIds.every((id) => typeof id === "string"))) ||
    typeof subject !== "string" ||
    !subject.trim() ||
    typeof bodyHtml !== "string" ||
    !bodyHtml.trim()
  ) {
    return NextResponse.json(
      { error: "recipientIds ('all' or a non-empty array), subject, and bodyHtml are required" },
      { status: 400 }
    );
  }

  if (!hasSmtpConfig()) {
    return NextResponse.json(
      { error: "Email is not configured on the server (missing SMTP settings)" },
      { status: 500 }
    );
  }

  // Resolve the target profile ids: either every real (non-seeded) member,
  // or exactly the ids the admin selected.
  let targetProfiles: { id: string; user_id: string | null }[];
  if (isAll) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id")
      .eq("is_seeded", false);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    targetProfiles = data || [];
  } else {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id")
      .in("id", recipientIds as string[]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    targetProfiles = data || [];
  }

  let emailByUserId: Map<string, string>;
  try {
    emailByUserId = await getEmailByUserId(supabase);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to look up member emails" },
      { status: 500 }
    );
  }

  const results: EmailResult[] = [];

  for (const profile of targetProfiles) {
    const email = profile.user_id ? emailByUserId.get(profile.user_id) : undefined;
    if (!email) {
      results.push({ id: profile.id, success: false, error: "No email on file" });
      continue;
    }

    try {
      await sendBroadcastEmail({ to: email, subject, bodyHtml });
      results.push({ id: profile.id, success: true });
    } catch (err) {
      results.push({ id: profile.id, success: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const failed = results.filter((r) => !r.success);
  return NextResponse.json({
    results,
    sentCount: results.length - failed.length,
    failedCount: failed.length,
  });
}
