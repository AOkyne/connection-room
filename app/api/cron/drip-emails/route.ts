import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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

// Runs once daily via Vercel Cron (see vercel.json). For each defined drip
// email, finds members who crossed that email's day threshold since
// onboarding and haven't received it yet, sends it, and records it in
// drip_emails_sent so it's never sent twice — including catching up members
// missed by a prior failed/skipped run, since the query is ">= threshold",
// not an exact-day match.
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

  const { data: drips, error: dripsError } = await supabase
    .from("email_templates")
    .select("key, subject, body, sign_off, days_after_onboarding")
    .not("days_after_onboarding", "is", null)
    .eq("active", true);

  if (dripsError) {
    console.error("Error fetching drip templates:", dripsError);
    return NextResponse.json({ error: "Failed to fetch drip templates" }, { status: 500 });
  }

  const summary: Record<string, DripSummary> = {};

  for (const drip of drips || []) {
    summary[drip.key] = { sent: 0, failed: 0, skipped: 0 };

    const thresholdDate = new Date(
      Date.now() - drip.days_after_onboarding * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: candidates, error: candidatesError } = await supabase
      .from("profiles")
      .select("id, user_id, display_name")
      .not("onboarding_completed_at", "is", null)
      .lte("onboarding_completed_at", thresholdDate);

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
    const toSend = candidates.filter((c) => !sentIds.has(c.id));

    for (const profile of toSend) {
      if (!profile.user_id) {
        summary[drip.key].skipped++;
        continue;
      }

      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
          profile.user_id
        );
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
          console.error(
            `Sent ${drip.key} to profile ${profile.id} but failed to record it:`,
            insertError
          );
        }

        summary[drip.key].sent++;
      } catch (err) {
        console.error(`Error sending ${drip.key} to profile ${profile.id}:`, err);
        summary[drip.key].failed++;
      }
    }
  }

  return NextResponse.json({ summary });
}
