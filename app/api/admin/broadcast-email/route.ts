import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/require-admin";
import { hasSmtpConfig, sendBroadcastEmail, logEmailSend } from "@/lib/email/send";
import { substituteMergeTags } from "@/lib/email/render-template";

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

  let body: { recipientIds?: unknown; subject?: unknown; bodyHtml?: unknown; broadcastBatchId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { recipientIds, subject, bodyHtml, broadcastBatchId: requestedBatchId } = body;
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
  // Narrowed to string just above, but re-bound to real `string`-typed
  // consts so the sendToOneProfile() closure below doesn't see them as
  // `unknown` -- TS can't carry a narrowing on a destructured object
  // property into a nested function declared later in the same scope.
  const validatedSubject: string = subject;
  const validatedBodyHtml: string = bodyHtml;

  if (!hasSmtpConfig()) {
    return NextResponse.json(
      { error: "Email is not configured on the server (missing SMTP settings)" },
      { status: 500 }
    );
  }

  // Resolve the target profile ids: either every real (non-seeded) member,
  // or exactly the ids the admin selected. display_name is included to
  // resolve the {{firstName}} merge tag per recipient below.
  let targetProfiles: { id: string; user_id: string | null; display_name: string | null }[];
  if (isAll) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, display_name")
      .eq("is_seeded", false);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    targetProfiles = data || [];
  } else {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, display_name")
      .in("id", recipientIds as string[]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    targetProfiles = data || [];
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://community.trevorjamesla.com";

  let emailByUserId: Map<string, string>;
  try {
    emailByUserId = await getEmailByUserId(supabase);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to look up member emails" },
      { status: 500 }
    );
  }

  // One id shared across every recipient's sent_emails row for this
  // broadcast, so Email History groups them into a single "campaign"
  // (migration 095). The composer now sends a large list as many small
  // requests (lib/admin/broadcast.ts -- one 60s-capped request can't send
  // 100+ emails through SMTP), so it supplies ONE id for all of them;
  // only generated here when a caller doesn't pass one.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const broadcastBatchId =
    typeof requestedBatchId === "string" && UUID_RE.test(requestedBatchId) ? requestedBatchId : crypto.randomUUID();

  async function sendToOneProfile(profile: (typeof targetProfiles)[number]): Promise<EmailResult> {
    const email = profile.user_id ? emailByUserId.get(profile.user_id) : undefined;
    if (!email) {
      return { id: profile.id, success: false, error: "No email on file" };
    }

    // Logged BEFORE sending now, not after -- open/click tracking
    // (migration 095) needs this specific recipient's sent_emails row id
    // to embed in the tracking pixel/links, which only exists once the
    // row does. logEmailSend() itself still never throws (returns null
    // on failure), so a logging problem degrades to "this one recipient
    // sends without tracking," never blocks the send.
    const trackingId = await logEmailSend(supabase, {
      category: "broadcast",
      to: email,
      subject: validatedSubject,
      recipientUserId: profile.user_id,
      broadcastBatchId,
    });

    try {
      const firstName = profile.display_name?.split(" ")[0];
      const personalizedBody = substituteMergeTags(validatedBodyHtml, { firstName, appUrl });
      await sendBroadcastEmail({ to: email, subject: validatedSubject, bodyHtml: personalizedBody, trackingId });
      return { id: profile.id, success: true };
    } catch (err) {
      // The send failed after a log row was already created for it --
      // remove that row (best-effort) so Email History doesn't show a
      // "sent" entry for an email that never actually went out.
      if (trackingId) {
        supabase.from("sent_emails").delete().eq("id", trackingId).then(
          () => {},
          () => {}
        );
      }
      return { id: profile.id, success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // Sent in concurrent batches, not one at a time -- a fully sequential
  // loop over a real "All Members" list (100+ recipients, each a real SMTP
  // round trip plus a Supabase insert) reliably exceeded this route's
  // 60-second maxDuration partway through, silently truncating the
  // broadcast with no clean error (confirmed live: 84 of 132 sent, then
  // Vercel killed the function and the client saw a mangled generic
  // error instead of a real one). BATCH_SIZE matches the nodemailer
  // transporter's own maxConnections (lib/email/send.ts) so this doesn't
  // ask the SMTP pool for more concurrent connections than it actually has.
  const BATCH_SIZE = 10;
  const results: EmailResult[] = [];
  for (let i = 0; i < targetProfiles.length; i += BATCH_SIZE) {
    const batch = targetProfiles.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(sendToOneProfile));
    results.push(...batchResults);
  }

  const failed = results.filter((r) => !r.success);
  return NextResponse.json({
    results,
    sentCount: results.length - failed.length,
    failedCount: failed.length,
  });
}
