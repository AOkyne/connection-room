import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "Use again" on the broadcast page: everything needed to load a past
// broadcast back into the composer.
//
// - Recipients come from sent_emails (one row per person it went to), so
//   they're available for every past broadcast with a batch id. Returned
//   as profiles.id values, which is what the composer's recipient picker
//   and the send route use (sent_emails stores auth user ids).
// - Subject/body come from broadcast_campaign_contents (migration 103),
//   which only exists for broadcasts sent after it shipped -- bodyHtml is
//   null for older ones, and the page says so.
export async function GET(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase } = auth;
  const { batchId } = await params;
  if (!UUID_RE.test(batchId)) {
    return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });
  }

  const [contentResult, sentResult] = await Promise.all([
    supabase.from("broadcast_campaign_contents").select("subject, body_html").eq("broadcast_batch_id", batchId).maybeSingle(),
    supabase.from("sent_emails").select("subject, recipient_user_id").eq("broadcast_batch_id", batchId),
  ]);

  if (sentResult.error) {
    return NextResponse.json({ error: sentResult.error.message }, { status: 500 });
  }
  // A missing content table/row isn't fatal -- the recipients alone are
  // still useful.
  if (contentResult.error) {
    console.warn("[broadcast-campaigns content] content lookup failed:", contentResult.error.message);
  }

  const userIds = Array.from(
    new Set((sentResult.data || []).map((r) => r.recipient_user_id).filter((id): id is string => !!id))
  );

  let recipientIds: string[] = [];
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_id")
      .in("user_id", userIds);
    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }
    recipientIds = (profiles || []).map((p) => p.id);
  }

  return NextResponse.json({
    subject: contentResult.data?.subject || sentResult.data?.[0]?.subject || "",
    bodyHtml: contentResult.data?.body_html ?? null,
    recipientIds,
  });
}
