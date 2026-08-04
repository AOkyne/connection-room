import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

// Lists Question of the Week entries eligible for the newsletter
// generator (app/app/admin/newsletter/page.tsx): newsletter_eligible
// rows from space_weekly_prompts (migration 089), joined to their space
// name and the actual posts row (via the new post_id FK) for the real
// question text/id the generator links to. Only rows with a linked post
// are useful here -- a scheduled-but-not-yet-posted week has no post to
// link to yet.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("space_weekly_prompts")
    .select("id, space_id, week_number, status, newsletter_eligible, newsletter_display_order, post_id, spaces(name), posts(id, body)")
    .eq("newsletter_eligible", true)
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
