import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasSmtpConfig, sendCommentReplyNotificationEmail, logEmailSend } from "@/lib/email/send";

// Called by the comments_notify_new_reply trigger (migration 091) via
// pg_net, fire-and-forget, every time a reply (parent_comment_id IS NOT
// NULL) is inserted into comments. Same trust boundary/secret as the
// sibling new-post-notification / new-connection-message webhooks.
//
// Notifies up to two people: the author of the comment directly replied
// to, and -- if different -- the author of the thread's root comment
// ("replies within a thread you started"). Deduped against each other
// (so replying to a top-level comment, where those two are the same
// person, only ever sends one email) and against comment_notification_log
// (so a retried webhook delivery never double-sends). Never notifies
// someone about their own reply.
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const webhookSecret = process.env.POST_NOTIFICATION_WEBHOOK_SECRET;
  if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { commentId, parentCommentId, rootCommentId, postId, replierId } = body;
  if (!commentId || !parentCommentId || !postId || !replierId) {
    return NextResponse.json(
      { error: "Missing commentId, parentCommentId, postId, or replierId" },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }

  if (!hasSmtpConfig()) {
    return NextResponse.json(
      { error: "Email is not configured on the server (missing SMTP settings)" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://community.trevorjamesla.com";

  const { data: replier, error: replierError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", replierId)
    .maybeSingle();
  if (replierError || !replier) {
    return NextResponse.json({ error: "Replier profile not found" }, { status: 404 });
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("space_id")
    .eq("id", postId)
    .maybeSingle();
  if (postError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { data: space } = await supabase.from("spaces").select("name").eq("id", post.space_id).maybeSingle();
  const spaceName = space?.name || "the community";

  const { data: parentComment, error: parentError } = await supabase
    .from("comments")
    .select("user_id, deleted_at")
    .eq("id", parentCommentId)
    .maybeSingle();
  if (parentError || !parentComment) {
    return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
  }

  // Direct reply target, plus -- if this reply landed deeper in a thread
  // someone else started -- that thread's root author too. rootCommentId
  // equals parentCommentId when replying directly to a top-level comment,
  // so the Set below naturally collapses that case to one recipient.
  const candidateIds = new Set<string>([parentComment.user_id]);
  if (rootCommentId && rootCommentId !== parentCommentId) {
    const { data: rootComment } = await supabase
      .from("comments")
      .select("user_id")
      .eq("id", rootCommentId)
      .maybeSingle();
    if (rootComment?.user_id) candidateIds.add(rootComment.user_id);
  }
  candidateIds.delete(replierId); // never self-notify

  const replyUrl = `${appUrl}/app/spaces/${post.space_id}/posts/${postId}?comment=${commentId}`;
  const results: Record<string, string> = {};

  for (const recipientId of candidateIds) {
    const { data: existing } = await supabase
      .from("comment_notification_log")
      .select("id")
      .eq("comment_id", commentId)
      .eq("notified_user_id", recipientId)
      .maybeSingle();
    if (existing) {
      results[recipientId] = "already notified";
      continue;
    }

    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("notification_frequency")
      .eq("user_id", recipientId)
      .maybeSingle();
    if (recipientProfile?.notification_frequency === "off") {
      results[recipientId] = "notifications off";
      continue;
    }

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(recipientId);
    const email = userData?.user?.email;
    if (userError || !email) {
      results[recipientId] = "no email on file";
      continue;
    }

    await sendCommentReplyNotificationEmail({
      to: email,
      replierName: replier.display_name || "A member",
      spaceName,
      replyUrl,
    });

    await supabase.from("comment_notification_log").insert({
      comment_id: commentId,
      notified_user_id: recipientId,
    });

    await logEmailSend(supabase, {
      category: "comment_reply",
      to: email,
      subject: `${replier.display_name || "A member"} replied to your comment in ${spaceName}`,
      recipientUserId: recipientId,
    });

    results[recipientId] = "sent";
  }

  return NextResponse.json({ results });
}
