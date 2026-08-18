import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

// Lists Question of the Week entries eligible for the newsletter
// generator (app/app/admin/newsletter/page.tsx) and the "Insert Question"
// picker in BroadcastRichTextEditor: newsletter_eligible rows from
// space_weekly_prompts (migration 089), joined to their space name and
// the actual posts row (via the post_id FK) for the real question
// text/id the generator links to. Only rows with a linked post are
// useful here -- a scheduled-but-not-yet-posted week has no post to link
// to yet.
//
// status = 'active' only -- this previously returned every eligible row
// regardless of week, so admins picking a question saw every space's
// entire history of past questions mixed in with the current one. Each
// space has at most one 'active' row at a time (the weekly-prompts cron
// flips the prior week to 'archived' when it posts a new one), so this
// naturally narrows the list to "this week's question, per space."
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("space_weekly_prompts")
    .select("id, space_id, week_number, status, newsletter_eligible, newsletter_display_order, post_id, spaces(name), posts(id, body)")
    .eq("newsletter_eligible", true)
    .eq("status", "active")
    .not("post_id", "is", null)
    .order("newsletter_display_order", { ascending: true, nullsFirst: false })
    .order("week_number", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const questions = (data || []).map((row: any) => ({
    id: row.id,
    postId: row.post_id,
    spaceId: row.space_id,
    spaceName: row.spaces?.name || row.space_id,
    questionText: row.posts?.body || "",
    weekNumber: row.week_number,
    status: row.status,
  }));

  return NextResponse.json({ questions });
}
