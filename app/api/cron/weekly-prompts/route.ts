import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Posts each space's next "Question of the Week" every Monday (UTC,
// matching this route's own daily external trigger time -- see below).
// Previously ran on a per-space elapsed-7-days clock (migration 073's
// original design), which staggered different spaces onto different
// weekdays from each other; requested instead: all spaces change over on
// the same day. Not registered in vercel.json -- Vercel's Hobby plan caps
// at 2 cron jobs, both already used (drip-emails, space-digest-emails) --
// so, like space-digest-emails, this route is meant to be triggered
// externally (e.g. cron-job.org) once daily, hitting this endpoint with
// the same CRON_SECRET bearer token used everywhere else. Safe to run more
// than once on a Monday (or miss a Monday) -- see the same-day guard and
// the "not-monday" skip below, both idempotent.
export const maxDuration = 30;

function isSameUtcDate(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

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

  const now = new Date();
  // getUTCDay(): 0=Sunday, 1=Monday. This route's own external trigger
  // runs once daily -- whichever timezone that's scheduled in, the UTC
  // weekday it lands on is what "Monday" means here. If cron-job.org is
  // ever moved to a schedule that crosses midnight UTC on the day meant
  // to be "Monday" locally, adjust the external trigger time, not this
  // check.
  const isMonday = now.getUTCDay() === 1;

  for (const spaceId of spaceIds) {
    try {
      if (!isMonday) {
        results.push({ spaceId, status: "not-monday" });
        continue;
      }

      const { data: schedule } = await supabase
        .from("space_prompt_schedule")
        .select("next_week, last_posted_at")
        .eq("space_id", spaceId)
        .maybeSingle();

      let nextWeek = schedule?.next_week ?? 1;
      const lastPostedAt = schedule?.last_posted_at ? new Date(schedule.last_posted_at) : null;

      // Guards against posting twice if this route is ever triggered more
      // than once on the same Monday (retry, manual test run, etc.).
      if (lastPostedAt && isSameUtcDate(lastPostedAt, now)) {
        results.push({ spaceId, status: "already-posted-today" });
        continue;
      }

      let { data: promptRow } = await supabase
        .from("space_weekly_prompts")
        .select("prompt_text")
        .eq("space_id", spaceId)
        .eq("week_number", nextWeek)
        .maybeSingle();

      // Sequence exhausted for this space (typically past week 16) --
      // start over at week 1, UNLESS an admin has since added prompts
      // beyond where this space left off, in which case the select above
      // already found one and this block is skipped entirely.
      if (!promptRow) {
        nextWeek = 1;
        const { data: firstPrompt } = await supabase
          .from("space_weekly_prompts")
          .select("prompt_text")
          .eq("space_id", spaceId)
          .eq("week_number", 1)
          .maybeSingle();
        promptRow = firstPrompt;
      }

      if (!promptRow) {
        results.push({ spaceId, status: "no-prompts-configured" });
        continue;
      }

      // Only the current week's prompt is ever pinned -- unpin last
      // week's before posting this week's, so exactly one stays
      // prominent per space. The previous post itself is untouched
      // otherwise (still visible in normal post history, still
      // commentable). space_weekly_prompts.status (migration 089)
      // mirrors this same "exactly one active per space" rule, so the
      // now-superseded week's row also flips to archived here.
      await supabase.from("posts").update({ pinned: false }).eq("space_id", spaceId).eq("pinned", true);
      await supabase.from("space_weekly_prompts").update({ status: "archived" }).eq("space_id", spaceId).eq("status", "active");

      const { data: insertedPost, error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: adminProfile.user_id,
          space_id: spaceId,
          author_name: adminProfile.display_name || "Trevor James",
          title: "Question of the Week",
          body: promptRow.prompt_text,
          prompt_id: `weekly:${spaceId}:${nextWeek}`,
          pinned: true,
        })
        .select("id")
        .single();

      if (insertError || !insertedPost) {
        results.push({ spaceId, status: "post-failed: " + (insertError?.message || "unknown error"), week: nextWeek });
        continue;
      }

      // post_id links this week's row back to the post the generator
      // (app/app/admin/newsletter) reads from -- without it there'd be
      // no way to resolve "this week's question" to a real post/URL
      // except by re-deriving the prompt_id string convention.
      await supabase
        .from("space_weekly_prompts")
        .update({ status: "active", post_id: insertedPost.id })
        .eq("space_id", spaceId)
        .eq("week_number", nextWeek);

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
