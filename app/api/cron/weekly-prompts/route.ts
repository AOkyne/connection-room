import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Posts each space's next "Question of the Week" once ~7 days have
// elapsed since its last one (see migration 073's own comment for why
// this is elapsed-time rather than a fixed weekday -- a late/missed run
// still catches up correctly on its next run, matching the drip-emails
// cron's existing pattern). Not registered in vercel.json -- Vercel's
// Hobby plan caps at 2 cron jobs, both already used (drip-emails,
// space-digest-emails) -- so, like space-digest-emails, this route is
// meant to be triggered externally (e.g. cron-job.org) on a daily
// schedule, hitting this endpoint with the same CRON_SECRET bearer
// token used everywhere else.
export const maxDuration = 30;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // The author of record for every auto-posted prompt -- posts.user_id is
  // NOT NULL and must reference a real auth user, so these post as the
  // one real admin account rather than a synthetic "system" user.
  const { data: adminProfile, error: adminError } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .eq("role", "admin")
    .not("user_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (adminError || !adminProfile?.user_id) {
    return NextResponse.json({ error: "Could not find an admin account to post as" }, { status: 500 });
  }

  const { data: spaceRows, error: spacesError } = await supabase
    .from("space_weekly_prompts")
    .select("space_id")
    .order("space_id");

  if (spacesError) {
    return NextResponse.json({ error: spacesError.message }, { status: 500 });
  }

  const spaceIds = Array.from(new Set((spaceRows || []).map((r) => r.space_id)));
  const results: Array<{ spaceId: string; status: string; week?: number }> = [];

  for (const spaceId of spaceIds) {
    try {
      const { data: schedule } = await supabase
        .from("space_prompt_schedule")
        .select("next_week, last_posted_at")
        .eq("space_id", spaceId)
        .maybeSingle();

      const nextWeek = schedule?.next_week ?? 1;
      const lastPostedAt = schedule?.last_posted_at ? new Date(schedule.last_posted_at) : null;

      if (nextWeek > 16) {
        results.push({ spaceId, status: "exhausted" });
        continue;
      }

      const dueNow = !lastPostedAt || Date.now() - lastPostedAt.getTime() >= SEVEN_DAYS_MS;
      if (!dueNow) {
        results.push({ spaceId, status: "not-due" });
        continue;
      }

      const { data: promptRow, error: promptError } = await supabase
        .from("space_weekly_prompts")
        .select("prompt_text")
        .eq("space_id", spaceId)
        .eq("week_number", nextWeek)
        .maybeSingle();

      if (promptError || !promptRow) {
        results.push({ spaceId, status: "missing-prompt", week: nextWeek });
        continue;
      }

      // Only the current week's prompt is ever pinned -- unpin last
      // week's before posting this week's, so exactly one stays
      // prominent per space. The previous post itself is untouched
      // otherwise (still visible in normal post history, still
      // commentable).
      await supabase.from("posts").update({ pinned: false }).eq("space_id", spaceId).eq("pinned", true);

      const { error: insertError } = await supabase.from("posts").insert({
        user_id: adminProfile.user_id,
        space_id: spaceId,
        author_name: adminProfile.display_name || "Trevor James",
        title: "Question of the Week",
        body: promptRow.prompt_text,
        prompt_id: `weekly:${spaceId}:${nextWeek}`,
        pinned: true,
      });

      if (insertError) {
        results.push({ spaceId, status: "post-failed: " + insertError.message, week: nextWeek });
        continue;
      }

      await supabase.from("space_prompt_schedule").upsert({
        space_id: spaceId,
        next_week: nextWeek + 1,
        last_posted_at: new Date().toISOString(),
      });

      results.push({ spaceId, status: "posted", week: nextWeek });
    } catch (err) {
      results.push({ spaceId, status: "error: " + (err instanceof Error ? err.message : String(err)) });
    }
  }

  return NextResponse.json({ results });
}
