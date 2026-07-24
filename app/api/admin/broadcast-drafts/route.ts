import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("broadcast_drafts")
    .select("id, subject, body_html, recipient_mode, recipient_ids, created_at, updated_at")
    .eq("admin_user_id", auth.userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ drafts: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { subject?: unknown; bodyHtml?: unknown; recipientMode?: unknown; recipientIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject : "";
  const bodyHtml = typeof body.bodyHtml === "string" ? body.bodyHtml : "";
  const recipientMode = body.recipientMode === "select" ? "select" : "all";
  const recipientIds = Array.isArray(body.recipientIds) ? body.recipientIds : [];

  const { data, error } = await auth.supabase
    .from("broadcast_drafts")
    .insert({
      admin_user_id: auth.userId,
      subject,
      body_html: bodyHtml,
      recipient_mode: recipientMode,
      recipient_ids: recipientIds,
    })
    .select("id, subject, body_html, recipient_mode, recipient_ids, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ draft: data });
}
