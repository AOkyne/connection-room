import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;

  let body: { subject?: unknown; bodyHtml?: unknown; recipientMode?: unknown; recipientIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.subject === "string") updates.subject = body.subject;
  if (typeof body.bodyHtml === "string") updates.body_html = body.bodyHtml;
  if (body.recipientMode === "select" || body.recipientMode === "all") updates.recipient_mode = body.recipientMode;
  if (Array.isArray(body.recipientIds)) updates.recipient_ids = body.recipientIds;

  // Scoped to admin_user_id, not just id -- an admin can only ever update
  // their own draft, never one belonging to a different admin account.
  const { data, error } = await auth.supabase
    .from("broadcast_drafts")
    .update(updates)
    .eq("id", id)
    .eq("admin_user_id", auth.userId)
    .select("id, subject, body_html, recipient_mode, recipient_ids, created_at, updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  return NextResponse.json({ draft: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;

  const { error } = await auth.supabase
    .from("broadcast_drafts")
    .delete()
    .eq("id", id)
    .eq("admin_user_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
