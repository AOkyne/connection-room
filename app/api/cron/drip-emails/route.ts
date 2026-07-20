import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { hasSmtpConfig, sendBrandedEmail } from "@/lib/email/send";
import { renderTemplateBody } from "@/lib/email/render-template";

// Sends to every qualifying member sequentially, so give this route the
// most headroom the plan allows rather than the default timeout.
export const maxDuration = 60;

interface DripSummary {
  sent: number;
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
// threshold matches EVERY template in the sequence at once -- without
// this, the first run after this cron had been silently not-running for
// days would email that member all three reminders back-to-back in the
// same run.
//
// Dedup is DB-authoritative, not just an in-memory Set scoped to this one
// call: `handled` is seeded up front from every drip_emails_sent row that
// already exists for ANY template in this family, and re-checked as the
// run adds to it. A member with ANY row in the family is considered done
// with it, full stop -- they get no further email and no further row.
// This intentionally does more than the minimum needed to stop
// same-template double-sends (drip_emails_sent's own unique constraint on
// (profile_id, email_key) already guarantees that); it's what actually
// keeps different templates in the same family from both going out to the
// same person. A first version of this route relied purely on an
// in-process Set, which turned out not to be a strong enough guarantee --
// confirmed live: two members received a real day3 email AND a real day1
// email from what was intended to be a single dedup'd run.
async function runDripSequence(
  supabase: SupabaseClient,
  drips: DripTemplate[],
  fetchCandidates: (thresholdDate: string) => Promise<{ data: DripCandidate[] | null; error: unknown }>,
  appUrl: string,
  summary: Record<string, DripSummary>
): Promise<void> {
  const sorted = [...drips].sort((a, b) => b.days - a.days);
  const familyKeys = sorted.map((d) => d.key);

  const { data: alreadyHandledRows, error: alreadyHandledError } = await supabase
    .from("drip_emails_sent")
    .select("profile_id")
    .in("email_key", familyKeys);

  if (alreadyHandledError) {
    console.error("Error checking already-handled profiles for this drip family:", alreadyHandledError);
    return;
  }

  const handled = new Set((alreadyHandledRows || []).map((r) => r.profile_id));

  for (const drip of sorted) {
    summary[drip.key] = { sent: 0, failed: 0, skipped: 0 };

    const thresholdDate = new Date(Date.now() - drip.days * 24 * 60 * 60 * 1000).toISOString();
    const { data: candidates, error: candidatesError } = await fetchCandidates(thresholdDate);

    if (candidatesError) {
      console.error(`Error fetching candidates for ${drip.key}:`, candidatesError);
      continue;
    }
    if (!candidates || candidates.length === 0) continue;

    const toProcess = candidates.filter((c) => !handled.has(c.id));

    for (const profile of toProcess) {
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

        handled.add(profile.id);
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
