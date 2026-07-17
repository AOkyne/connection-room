import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasSmtpConfig, sendDigestEmail } from "@/lib/email/send";

// Sends to every qualifying member sequentially, so give this route the
// most headroom the plan allows rather than the default timeout -- same
// reasoning as the existing drip-emails cron.
export const maxDuration = 60;

// NOT wired into vercel.json -- this project already has 2 daily Vercel
// crons and is likely on the Hobby plan (2-cron cap). Trigger this route
// externally instead (cron-job.org), once daily, hitting this exact path
// with `Authorization: Bearer <CRON_SECRET>` (same secret/header as the
// existing Vercel cron routes -- same trust boundary, just a different
// caller).
//
// Runs both daily and weekly digests in one invocation: "daily" members
// are due every run; "weekly" members are only due when today is the
// designated digest day (Sunday, i.e. getDay() === 0) -- change WEEKLY_DAY
// below if a different day is wanted. Skips a member entirely (no email)
// if they have zero new posts since their last digest.
const WEEKLY_DAY = 0; // 0 = Sunday

interface DigestSummary {
  sent: number;
  skipped: number;
  failed: number;
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

  if (!hasSmtpConfig()) {
    return NextResponse.json(
      { error: "Email is not configured on the server (missing SMTP settings)" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://community.trevorjamesla.com";

  const dueFrequencies: Array<"daily" | "weekly"> = ["daily"];
  if (new Date().getDay() === WEEKLY_DAY) {
    dueFrequencies.push("weekly");
  }

  const summary: Record<string, DigestSummary> = {};

  for (const frequency of dueFrequencies) {
    summary[frequency] = { sent: 0, skipped: 0, failed: 0 };

    const { data: candidates, error: candidatesError } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .eq("notification_frequency", frequency)
      .not("user_id", "is", null);

    if (candidatesError) {
      console.error(`Error fetching ${frequency} digest candidates:`, candidatesError);
      continue;
    }

    const defaultLookbackMs = (frequency === "daily" ? 24 : 7 * 24) * 60 * 60 * 1000;

    for (const profile of candidates || []) {
      try {
        const { data: lastLog } = await supabase
          .from("notification_log")
          .select("sent_at")
          .eq("user_id", profile.user_id)
          .eq("notification_type", frequency)
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const since = lastLog?.sent_at
          ? new Date(lastLog.sent_at)
          : new Date(Date.now() - defaultLookbackMs);

        const { data: memberships, error: membershipsError } = await supabase
          .from("space_memberships")
          .select("space_id")
          .eq("user_id", profile.user_id);

        if (membershipsError || !memberships || memberships.length === 0) {
          summary[frequency].skipped++;
          continue;
        }

        const spaceIds = memberships.map((m) => m.space_id);

        const { data: newPosts, error: postsError } = await supabase
          .from("posts")
          .select("space_id")
          .in("space_id", spaceIds)
          .neq("user_id", profile.user_id)
          .gt("created_at", since.toISOString());

        if (postsError) {
          summary[frequency].failed++;
          continue;
        }

        if (!newPosts || newPosts.length === 0) {
          summary[frequency].skipped++;
          continue;
        }

        const { data: spaces } = await supabase.from("spaces").select("id, name").in("id", spaceIds);
        const spaceNameById = new Map((spaces || []).map((s) => [s.id, s.name]));

        const countBySpace = new Map<string, number>();
        for (const post of newPosts) {
          countBySpace.set(post.space_id, (countBySpace.get(post.space_id) || 0) + 1);
        }

        const spaceBreakdown = Array.from(countBySpace.entries()).map(([spaceId, count]) => ({
          spaceName: spaceNameById.get(spaceId) || "a space",
          count,
        }));

        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);
        const email = userData?.user?.email;
        if (userError || !email) {
          summary[frequency].skipped++;
          continue;
        }

        await sendDigestEmail({ to: email, frequency, appUrl, spaceBreakdown });

        await supabase.from("notification_log").insert({
          user_id: profile.user_id,
          notification_type: frequency,
        });

        summary[frequency].sent++;
      } catch (err) {
        console.error(`Error sending ${frequency} digest to ${profile.user_id}:`, err);
        summary[frequency].failed++;
      }
    }
  }

  return NextResponse.json({ dueFrequencies, summary });
}
