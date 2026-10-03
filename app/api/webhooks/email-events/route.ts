import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import { normalizeProviderEvent } from "@/lib/experience/provider-events";

export const dynamic = "force-dynamic";

function tokenOk(given: string | null): boolean {
  const expected = process.env.EMAIL_WEBHOOK_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// SMTP2GO event webhook (bounces, spam complaints, unsubscribes).
// Configure in SMTP2GO with the URL
//   https://community.trevorjamesla.com/api/webhooks/email-events?token=EMAIL_WEBHOOK_SECRET
// Every event is stored once (deduped on the provider event key); hard
// bounces and complaints add a permanent suppression that every email
// feature can honor; provider unsubscribes opt the member out of question
// invitations. Nothing here ever changes an invitation's sent state.
export async function POST(request: NextRequest) {
  if (!tokenOk(request.nextUrl.searchParams.get("token"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  let body: unknown;
  const contentType = request.headers.get("content-type") || "";
  try {
    body = contentType.includes("json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const events = (Array.isArray(body) ? body : [body]) as Record<string, unknown>[];

  for (const raw of events) {
    const ev = normalizeProviderEvent(raw || {});
    const { error } = await supabase.from("email_provider_events").insert({
      provider: "smtp2go",
      provider_event_id: ev.providerEventId,
      event_type: ev.eventType,
      message_id: ev.messageId,
      email: ev.email,
      occurred_at: ev.occurredAt && !isNaN(Date.parse(ev.occurredAt)) ? new Date(ev.occurredAt).toISOString() : null,
      // Stored for diagnosis; the provider payload has no message body.
      payload: raw,
    });
    if (error?.code === "23505") continue; // duplicate delivery: already handled
    if (error) {
      console.error("[email-events] store failed:", error.message);
      return NextResponse.json({ error: "Store failed" }, { status: 500 }); // provider will retry
    }

    if (ev.suppress && ev.email) {
      await supabase
        .from("email_suppressions")
        .upsert({ email: ev.email, reason: ev.suppress, source: "smtp2go" }, { onConflict: "email", ignoreDuplicates: true });
    }
    if (ev.unsubscribe && ev.email) {
      const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const user = data?.users.find((u) => u.email?.toLowerCase() === ev.email);
      if (user) {
        await supabase
          .from("experience_preferences")
          .upsert({ user_id: user.id, opted_out: true, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      }
    }
  }
  return NextResponse.json({ ok: true });
}
