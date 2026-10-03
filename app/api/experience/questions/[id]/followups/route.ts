import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { ANONYMOUS_FOLLOWUP_AUTHOR_NAME } from "@/lib/experience/threads";

export const dynamic = "force-dynamic";

const MAX_LENGTH = 2000;

// The author of an ANONYMOUS question responding or replying in their own
// thread. Written under the system account (shown as "Question author"),
// with the real author recorded only in experience_anonymous_comments --
// so a follow-up can't reveal who asked. (The database refuses the
// author's ordinary comments in this thread, so this is the only path.)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, userId } = auth;
  const { id } = await params;

  const { data: q } = await supabase
    .from("experience_questions")
    .select("id, author_id, anonymous, status, thread_post_id")
    .eq("id", id)
    .maybeSingle();
  if (!q || q.author_id !== userId || !q.anonymous) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (q.status !== "open" || !q.thread_post_id) {
    return NextResponse.json({ error: "This conversation is closed." }, { status: 409 });
  }

  let body: { body?: unknown; parentCommentId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text || text.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Write 1-${MAX_LENGTH} characters.` }, { status: 400 });
  }

  let parentId: string | null = null;
  let rootId: string | null = null;
  if (typeof body.parentCommentId === "string" && body.parentCommentId) {
    const { data: parent } = await supabase
      .from("comments")
      .select("id, post_id, root_comment_id, deleted_at")
      .eq("id", body.parentCommentId)
      .maybeSingle();
    if (!parent || parent.post_id !== q.thread_post_id || parent.deleted_at) {
      return NextResponse.json({ error: "That reply can't be found." }, { status: 404 });
    }
    parentId = parent.id;
    rootId = parent.root_comment_id || parent.id;
  }

  const { data: settings } = await supabase.from("experience_settings").select("system_author_id").eq("id", 1).single();
  if (!settings?.system_author_id) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      user_id: settings.system_author_id,
      post_id: q.thread_post_id,
      body: text,
      author_name: ANONYMOUS_FOLLOWUP_AUTHOR_NAME,
      parent_comment_id: parentId,
      root_comment_id: rootId,
    })
    .select("id")
    .single();
  if (error || !comment) return NextResponse.json({ error: "Couldn't post that. Please try again." }, { status: 500 });

  const { error: mapError } = await supabase
    .from("experience_anonymous_comments")
    .insert({ comment_id: comment.id, question_id: q.id, real_user_id: userId });
  if (mapError) {
    await supabase.from("comments").delete().eq("id", comment.id);
    return NextResponse.json({ error: "Couldn't post that. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ commentId: comment.id });
}
