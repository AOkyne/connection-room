import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getPublicQuestion } from "@/lib/experience/member-service";
import { normalizeQuestionText } from "@/lib/experience/normalize";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ question: null });
  const question = await getPublicQuestion(auth.supabase, id, auth.userId);
  // Removed (or not yet activated) questions read as unavailable to everyone but their author.
  if (!question || (!question.viewerIsAuthor && (question.status === "removed" || !question.threadPostId))) {
    return NextResponse.json({ question: null });
  }
  return NextResponse.json({ question });
}

// The author manages their own question: email permission (on -> needs a
// moderator's approval; off -> no further emails, effective immediately
// for every scheduled invitation), wording, context, or removing it.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, userId } = auth;
  const { id } = await params;
  const { data: q } = await supabase.from("experience_questions").select("*").eq("id", id).maybeSingle();
  if (!q || q.author_id !== userId || q.source !== "member") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { emailPermission?: unknown; text?: unknown; context?: unknown; remove?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const changes: string[] = [];

  if (body.remove === true) {
    patch.status = "removed";
    changes.push("removed");
  }

  if (typeof body.text === "string") {
    const text = body.text.trim().replace(/\s+/g, " ");
    if (text.length < 10 || text.length > 300) {
      return NextResponse.json({ error: "Your question needs 10-300 characters." }, { status: 400 });
    }
    const normalized = normalizeQuestionText(text);
    const { data: dup } = await supabase
      .from("experience_questions")
      .select("id")
      .eq("normalized_text", normalized)
      .neq("id", id)
      .maybeSingle();
    if (dup) return NextResponse.json({ error: "That wording matches another question." }, { status: 409 });
    if (text !== q.text) {
      patch.text = text;
      patch.normalized_text = normalized;
      // Edited text must be re-approved before it's emailed again; the
      // question keeps its identity, so nobody gets it twice.
      if (q.email_review === "approved" || q.email_review === "pending") {
        patch.email_review = "pending";
        patch.email_text = null;
      }
      changes.push("text");
      if (q.thread_post_id) await supabase.from("posts").update({ body: text, updated_at: new Date().toISOString() }).eq("id", q.thread_post_id);
    }
  }

  if (typeof body.context === "string") {
    const context = body.context.trim();
    if (context.length > 600) return NextResponse.json({ error: "Context can be up to 600 characters." }, { status: 400 });
    patch.context = context || null;
    changes.push("context");
  }

  if (typeof body.emailPermission === "boolean") {
    patch.email_permission = body.emailPermission;
    if (body.emailPermission) {
      const textNow = (patch.text as string) || q.text;
      const stillApproved = q.email_review === "approved" && q.email_text === textNow && !patch.email_review;
      if (!stillApproved) patch.email_review = "pending";
    }
    changes.push(body.emailPermission ? "email_permission_on" : "email_permission_off");
  }

  const { error } = await supabase.from("experience_questions").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "Couldn't save your changes." }, { status: 500 });
  await supabase.from("experience_audit").insert({ actor_id: userId, action: "author_updated_question", question_id: id, detail: { changes } });
  return NextResponse.json({ ok: true });
}
