import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

// Per-question newsletter performance (item 7 of the feature spec,
// explicitly secondary priority). newsletter_events (migration 090) has
// no member-facing SELECT policy at all -- only INSERT -- so this can't
// be a client-side query like the rest of lib/admin/analytics.ts; it has
// to go through a service-role, admin-gated route like this one.
//
// Response/reply counts come from real `comments` rows, not from
// newsletter_events counts -- events can be missed (ad blockers, a tab
// closed before the insert lands), while a comment that exists, exists.
// The denominator (unique signed-in newsletter arrivals) has no other
// source, so it does come from newsletter_events.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const questionPostId = request.nextUrl.searchParams.get("questionPostId");
  const campaign = request.nextUrl.searchParams.get("campaign");
  if (!questionPostId) {
    return NextResponse.json({ error: "Missing questionPostId" }, { status: 400 });
  }

  let eventsQuery = auth.supabase
    .from("newsletter_events")
    .select("event_type, user_id")
    .eq("question_post_id", questionPostId);
  if (campaign) eventsQuery = eventsQuery.eq("campaign", campaign);

  const { data: events, error: eventsError } = await eventsQuery;
  if (eventsError) {
    return NextResponse.json({ error: eventsError.message }, { status: 500 });
  }

  const visits = (events || []).filter((e) => e.event_type === "newsletter_question_viewed").length;
  const signedInVisitorIds = new Set(
    (events || [])
      .filter((e) => e.event_type === "newsletter_question_viewed" && e.user_id)
      .map((e) => e.user_id as string)
  );

  const { data: comments, error: commentsError } = await auth.supabase
    .from("comments")
    .select("user_id, parent_comment_id")
    .eq("post_id", questionPostId);
  if (commentsError) {
    return NextResponse.json({ error: commentsError.message }, { status: 500 });
  }

  const responses = (comments || []).filter((c) => !c.parent_comment_id).length;
  const replies = (comments || []).filter((c) => c.parent_comment_id).length;

  const uniqueResponderIds = new Set((comments || []).map((c) => c.user_id));
  const uniqueRespondersFromNewsletter = [...uniqueResponderIds].filter((id) => signedInVisitorIds.has(id)).length;

  const conversionRate = signedInVisitorIds.size > 0 ? uniqueRespondersFromNewsletter / signedInVisitorIds.size : 0;

  return NextResponse.json({
    visits,
    uniqueSignedInVisitors: signedInVisitorIds.size,
    responses,
    replies,
    conversionRate,
  });
}
