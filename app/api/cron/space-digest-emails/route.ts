import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasSmtpConfig, sendDigestEmail, logEmailSend } from "@/lib/email/send";

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

    // Batch-fetch what used to be two separate round trips PER candidate
    // (notification_log lookup + space_memberships lookup) -- with 100+
    // candidates that was 200+ sequential requests before any email was
    // even sent, the main reason this route blew past its 60s timeout.
    const candidateIds = (candidates || []).map((c) => c.user_id);

    const { data: allLogs } = await supabase
      .from("notification_log")
      .select("user_id, sent_at")
      .eq("notification_type", frequency)
      .in("user_id", candidateIds)
      .order("sent_at", { ascending: false });

    // Ordered desc, so the first row seen per user is their latest.
    const lastSentByUser = new Map<string, string>();
    for (const log of allLogs || []) {
      if (!lastSentByUser.has(log.user_id)) lastSentByUser.set(log.user_id, log.sent_at);
    }

    const { data: allMemberships } = await supabase
      .from("space_memberships")
      .select("user_id, space_id")
      .in("user_id", candidateIds);

    const spaceIdsByUser = new Map<string, string[]>();
    for (const m of allMemberships || []) {
      const list = spaceIdsByUser.get(m.user_id) || [];
      list.push(m.space_id);
      spaceIdsByUser.set(m.user_id, list);
    }

    for (const profile of candidates || []) {
      try {
        const lastSentAt = lastSentByUser.get(profile.user_id);
        const since = lastSentAt ? new Date(lastSentAt) : new Date(Date.now() - defaultLookbackMs);

        const spaceIds = spaceIdsByUser.get(profile.user_id);

        if (!spaceIds || spaceIds.length === 0) {
          summary[frequency].skipped++;
          continue;
        }

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

        const totalCount = spaceBreakdown.reduce((sum, s) => sum + s.count, 0);
        await logEmailSend(supabase, {
          category: "digest",
          to: email,
          subject: `${totalCount} new post${totalCount === 1 ? "" : "s"} in your spaces`,
          recipientUserId: profile.user_id,
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
