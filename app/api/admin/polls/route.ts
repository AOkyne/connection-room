import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

// Creates a poll for the broadcast composer's "Insert Poll" button.
// Writes directly via the service-role client rather than through
// create_poll_with_options() (migration 099) -- that RPC is keyed on
// auth.uid(), which is NULL for a service-role caller, so an admin route
// inserts the rows itself instead, the same convention every other
// admin route in this app already follows for service-role writes
// (e.g. this route's sibling app/api/admin/broadcast-email/route.ts
// writing sent_emails directly).
//
// Optionally also creates a real Spaces post carrying the poll
// (spaceId), so web members without email see and vote on the exact
// same poll -- results merge across both audiences since they're the
// same poll_id either way.
// Admin "Polls" page: every poll, newest first, with totals per option.
// Counts only -- never who voted for what (same privacy line as
// get_poll_results(), migration 099). Service-role reads, since
// poll_votes has no SELECT policy for anyone.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase } = auth;

  const { data: polls, error: pollsError } = await supabase
    .from("polls")
    .select("id, question, post_id, allow_multiple, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (pollsError) {
    return NextResponse.json({ error: pollsError.message }, { status: 500 });
  }
  if (!polls || polls.length === 0) {
    return NextResponse.json({ polls: [] });
  }

  const pollIds = polls.map((p) => p.id);
  const postIds = polls.map((p) => p.post_id).filter((id): id is string => !!id);

  const [optionsResult, votesResult, postsResult] = await Promise.all([
    supabase.from("poll_options").select("id, poll_id, label, position").in("poll_id", pollIds).order("position"),
    supabase.from("poll_votes").select("poll_id, option_id, user_id").in("poll_id", pollIds).limit(50000),
    postIds.length > 0
      ? supabase.from("posts").select("id, space_id").in("id", postIds)
      : Promise.resolve({ data: [] as { id: string; space_id: string }[], error: null }),
  ]);
  const firstError = optionsResult.error || votesResult.error || postsResult.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const spaceIdByPost = new Map((postsResult.data || []).map((p) => [p.id, p.space_id as string]));
  const spaceIds = Array.from(new Set(spaceIdByPost.values()));
  const spaceNames = new Map<string, string>();
  if (spaceIds.length > 0) {
    const { data: spaces } = await supabase.from("spaces").select("id, name").in("id", spaceIds);
    for (const sp of spaces || []) spaceNames.set(sp.id, sp.name);
  }

  const votesByOption = new Map<string, number>();
  const votersByPoll = new Map<string, Set<string>>();
  for (const v of votesResult.data || []) {
    votesByOption.set(v.option_id, (votesByOption.get(v.option_id) || 0) + 1);
    if (!votersByPoll.has(v.poll_id)) votersByPoll.set(v.poll_id, new Set());
    votersByPoll.get(v.poll_id)!.add(v.user_id);
  }

  return NextResponse.json({
    polls: polls.map((p) => {
      const spaceId = p.post_id ? spaceIdByPost.get(p.post_id) : undefined;
      return {
        id: p.id,
        question: p.question,
        allowMultiple: !!p.allow_multiple,
        createdAt: p.created_at,
        spaceId: spaceId || null,
        spaceName: spaceId ? spaceNames.get(spaceId) || spaceId : null,
        voterCount: votersByPoll.get(p.id)?.size || 0,
        options: (optionsResult.data || [])
          .filter((o) => o.poll_id === p.id)
          .map((o) => ({ id: o.id, label: o.label, voteCount: votesByOption.get(o.id) || 0 })),
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase, userId } = auth;

  let body: { question?: unknown; options?: unknown; spaceId?: unknown; allowMultiple?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { question, options, spaceId } = body;
  const allowMultiple = body.allowMultiple === true;
  if (
    typeof question !== "string" ||
    !question.trim() ||
    !Array.isArray(options) ||
    options.length < 2 ||
    !options.every((o) => typeof o === "string" && o.trim())
  ) {
    return NextResponse.json({ error: "A question and at least two options are required" }, { status: 400 });
  }
  if (spaceId !== undefined && typeof spaceId !== "string") {
    return NextResponse.json({ error: "spaceId must be a string" }, { status: 400 });
  }

  let postId: string | null = null;

  if (spaceId) {
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        space_id: spaceId,
        user_id: userId,
        author_name: adminProfile?.display_name || "Trevor James",
        body: question.trim(),
      })
      .select("id")
      .single();

    if (postError) {
      return NextResponse.json({ error: postError.message }, { status: 500 });
    }
    postId = post.id;
  }

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({ post_id: postId, question: question.trim(), created_by: userId, allow_multiple: allowMultiple })
    .select("id")
    .single();

  if (pollError) {
    return NextResponse.json({ error: pollError.message }, { status: 500 });
  }

  const optionRows = (options as string[]).map((label, position) => ({
    poll_id: poll.id,
    label: label.trim(),
    position,
  }));

  const { data: insertedOptions, error: optionsError } = await supabase
    .from("poll_options")
    .insert(optionRows)
    .select("id, label, position")
    .order("position", { ascending: true });

  if (optionsError) {
    return NextResponse.json({ error: optionsError.message }, { status: 500 });
  }

  return NextResponse.json({
    pollId: poll.id,
    postId,
    options: (insertedOptions || []).map((o) => ({ id: o.id, label: o.label })),
  });
}
