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
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase, userId } = auth;

  let body: { question?: unknown; options?: unknown; spaceId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { question, options, spaceId } = body;
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
    .insert({ post_id: postId, question: question.trim(), created_by: userId })
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
