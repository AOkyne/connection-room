import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

async function ownFollowup(request: NextRequest, commentId: string) {
  const auth = await requireAuth(request);
  if (!auth.ok) return { error: NextResponse.json({ error: auth.error }, { status: auth.status }) };
  const { data } = await auth.supabase
    .from("experience_anonymous_comments")
    .select("comment_id, real_user_id")
    .eq("comment_id", commentId)
    .maybeSingle();
  if (!data || data.real_user_id !== auth.userId) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { auth };
}

// Edit an anonymous follow-up (same policy as editing your own comment).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await params;
  const r = await ownFollowup(request, commentId);
  if ("error" in r) return r.error;
  const body = await request.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text || text.length > 2000) return NextResponse.json({ error: "Write 1-2000 characters." }, { status: 400 });
  const { error } = await r.auth.supabase
    .from("comments")
    .update({ body: text, updated_at: new Date().toISOString() })
    .eq("id", commentId)
    .is("deleted_at", null);
  if (error) return NextResponse.json({ error: "Couldn't save." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Delete an anonymous follow-up: removed outright if nobody replied to it,
// otherwise left as "removed" so the replies keep their place -- the same
// rule as deleting your own comment.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await params;
  const r = await ownFollowup(request, commentId);
  if ("error" in r) return r.error;
  const supabase = r.auth.supabase;
  const { data: children } = await supabase.from("comments").select("id").eq("parent_comment_id", commentId).limit(1);
  const { error } = children?.length
    ? await supabase.from("comments").update({ deleted_at: new Date().toISOString() }).eq("id", commentId)
    : await supabase.from("comments").delete().eq("id", commentId);
  if (error) return NextResponse.json({ error: "Couldn't delete." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
