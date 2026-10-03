import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { EXPERIENCE_SPACE_ID, findQuestionByThreadPost, realAuthorsOfComments } from "@/lib/experience/threads";

export const dynamic = "force-dynamic";

// Report a question or a response in a "Your Experience Wanted" thread.
// Goes into the existing `reports` table (admin moderation). A question
// with an open report is never emailed until a moderator resolves it.
// For anonymous content the real author is recorded for moderators only.
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, userId } = auth;
  const body = await request.json().catch(() => ({}));
  const postId = typeof body.postId === "string" ? body.postId : null;
  const commentId = typeof body.commentId === "string" ? body.commentId : null;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!postId || !reason) return NextResponse.json({ error: "Tell us briefly what's wrong." }, { status: 400 });

  const { data: post } = await supabase.from("posts").select("id, space_id, user_id").eq("id", postId).maybeSingle();
  if (!post || post.space_id !== EXPERIENCE_SPACE_ID) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let reportedUserId: string | null = post.user_id;
  if (commentId) {
    const { data: comment } = await supabase.from("comments").select("id, post_id, user_id").eq("id", commentId).maybeSingle();
    if (!comment || comment.post_id !== postId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const real = await realAuthorsOfComments(supabase, [commentId]);
    reportedUserId = real.get(commentId) || comment.user_id;
  } else {
    const q = await findQuestionByThreadPost(supabase, postId);
    reportedUserId = q?.source === "member" ? q.authorId : null;
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: userId,
    reported_user_id: reportedUserId,
    post_id: postId,
    comment_id: commentId,
    reason,
    status: "open",
  });
  if (error) return NextResponse.json({ error: "Couldn't send your report." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
