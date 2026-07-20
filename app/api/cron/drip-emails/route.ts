import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { hasSmtpConfig, sendBrandedEmail } from "@/lib/email/send";
import { renderTemplateBody } from "@/lib/email/render-template";

// Sends to every qualifying member sequentially, so give this route the
// most headroom the plan allows rather than the default timeout.
export const maxDuration = 60;

interface DripSummary {
  sent: number;
  superseded: number;
  failed: number;
  skipped: number;
}

interface DripTemplate {
  key: string;
  subject: string;
  body: string;
  sign_off: string;
  days: number;
}

interface DripCandidate {
  id: string;
  user_id: string | null;
  display_name: string | null;
}

// Runs a sequence of same-family drip templates (e.g. day1/day3/day5) that
// share one candidate-matching shape, from the longest threshold down to
// the shortest. Because each candidate query is "elapsed >= threshold", not
// an exact-day match, a member who's further behind than the longest
// threshold matches EVERY template in the sequence at once -- without this,
// the first run after this cron had been silently not-running for days
// would email that member all three reminders back-to-back in the same
// run. Processing longest-first and excluding anyone already handled by a
// longer threshold this run means each member gets at most one real email
// per run (their most-advanced applicable reminder); the shorter
// thresholds they also matched are recorded in drip_emails_sent as
// "superseded" (no email sent) so they're never mistakenly sent later,
// out of order, once the member is already caught up.
async function runDripSequence(
  supabase: SupabaseClient,
  drips: DripTemplate[],
  fetchCandidates: (thresholdDate: string) => Promise<{ data: DripCandidate[] | null; error: unknown }>,
  appUrl: string,
  summary: Record<string, DripSummary>
): Promise<void> {
  const sorted = [...drips].sort((a, b) => b.days - a.days);
  const handledThisRun = new Set<string>();

  for (const drip of sorted) {
    summary[drip.key] = { sent: 0, superseded: 0, failed: 0, skipped: 0 };

    const thresholdDate = new Date(Date.now() - drip.days * 24 * 60 * 60 * 1000).toISOString();
    const { data: candidates, error: candidatesError } = await fetchCandidates(thresholdDate);

    if (candidatesError) {
      console.error(`Error fetching candidates for ${drip.key}:`, candidatesError);
      continue;
    }
    if (!candidates || candidates.length === 0) continue;

    const { data: alreadySent, error: alreadySentError } = await supabase
      .from("drip_emails_sent")
      .select("profile_id")
      .eq("email_key", drip.key)
      .in(
        "profile_id",
        candidates.map((c) => c.id)
      );

    if (alreadySentError) {
      console.error(`Error checking already-sent for ${drip.key}:`, alreadySentError);
      continue;
    }

    const sentIds = new Set((alreadySent || []).map((r) => r.profile_id));
    const toProcess = candidates.filter((c) => !sentIds.has(c.id));

    for (const profile of toProcess) {
      if (handledThisRun.has(profile.id)) {
        // Already got a longer-threshold reminder this run -- record this
        // shorter one as sent-without-emailing so it can't fire on its own
        // in a future run (created_at/onboarding_completed_at don't
        // change, so it would match forever otherwise).
        const { error: insertError } = await supabase
          .from("drip_emails_sent")
          .insert({ profile_id: profile.id, email_key: drip.key });
        if (insertError) {
          console.error(`Marked ${drip.key} superseded for profile ${profile.id} but failed to record it:`, insertError);
        }
        summary[drip.key].superseded++;
        continue;
      }

      if (!profile.user_id) {
        summary[drip.key].skipped++;
        continue;
      }

      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);
        const email = userData?.user?.email;
        if (userError || !email) {
          summary[drip.key].skipped++;
          continue;
        }

        const firstName = (profile.display_name || email.split("@")[0]).split(" ")[0];

        await sendBrandedEmail({
          to: email,
          subject: drip.subject,
          paragraphs: renderTemplateBody(drip.body, { firstName, appUrl }),
          appUrl,
          signOff: drip.sign_off,
        });

        const { error: insertError } = await supabase
          .from("drip_emails_sent")
          .insert({ profile_id: profile.id, email_key: drip.key });
        if (insertError) {
          console.error(`Sent ${drip.key} to profile ${profile.id} but failed to record it:`, insertError);
        }

        handledThisRun.add(profile.id);
        summary[drip.key].sent++;
      } catch (err) {
        console.error(`Error sending ${drip.key} to profile ${profile.id}:`, err);
        summary[drip.key].failed++;
      }
    }
  }
}

// Runs once daily via Vercel Cron (see vercel.json). For each defined drip
// email, finds members who crossed that email's day threshold since
// onboarding and haven't received it yet, sends it, and records it in
// drip_emails_sent so it's never sent twice — including catching up members
// missed by a prior failed/skipped run, since the query is ">= threshold",
// not an exact-day match (see runDripSequence's own comment for how that
// catch-up case is kept from sending the same member multiple emails in
// one run).
//
// Also runs a second, independent drip (migration 061) for members who
// started but never completed onboarding, anchored to profiles.created_at
// ("when they started") instead of onboarding_completed_at, and gated on
// completed_onboarding = false. Because that gate is re-checked on every
// run, a member who finishes their profile simply stops matching and never
// gets the next email in the sequence.
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

  const summary: Record<string, DripSummary> = {};

  const { data: drips, error: dripsError } = await supabase
    .from("email_templates")
    .select("key, subject, body, sign_off, days_after_onboarding")
    .not("days_after_onboarding", "is", null)
    .eq("active", true);

  if (dripsError) {
    console.error("Error fetching drip templates:", dripsError);
    return NextResponse.json({ error: "Failed to fetch drip templates" }, { status: 500 });
  }

  await runDripSequence(
    supabase,
    (drips || []).map((d) => ({ ...d, days: d.days_after_onboarding })),
    async (thresholdDate) =>
      supabase
        .from("profiles")
        .select("id, user_id, display_name")
        .not("onboarding_completed_at", "is", null)
        .lte("onboarding_completed_at", thresholdDate),
    appUrl,
    summary
  );

  // Second drip: signup-anchored reminders for members who never completed
  // onboarding (migration 061). Separate query shape from the sequence
  // above (created_at + completed_onboarding, not onboarding_completed_at),
  // so run as its own sequence rather than merged into the same one.
  const { data: incompleteDrips, error: incompleteDripsError } = await supabase
    .from("email_templates")
    .select("key, subject, body, sign_off, days_after_signup_if_incomplete")
    .not("days_after_signup_if_incomplete", "is", null)
    .eq("active", true);

  if (incompleteDripsError) {
    console.error("Error fetching onboarding-incomplete drip templates:", incompleteDripsError);
    return NextResponse.json({ summary });
  }

  await runDripSequence(
    supabase,
    (incompleteDrips || []).map((d) => ({ ...d, days: d.days_after_signup_if_incomplete })),
    async (thresholdDate) =>
      supabase
        .from("profiles")
        .select("id, user_id, display_name")
        .or("completed_onboarding.is.null,completed_onboarding.eq.false")
        .lte("created_at", thresholdDate),
    appUrl,
    summary
  );

  return NextResponse.json({ summary });
}
