import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasSmtpConfig } from "@/lib/email/send";
import { runExperienceTick } from "@/lib/experience/engine";
import { SmtpInvitationMailer } from "@/lib/experience/mailer";
import { SupabaseExperienceStore } from "@/lib/experience/supabase-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// "Your Experience Wanted" scheduler tick. Call hourly from the external
// scheduler (cron-job.org) with the CRON_SECRET bearer token. Safe to call
// any number of times: it does nothing until an admin activates the
// feature, never catches up missed waves, sends at most
// max_sends_per_run invitations per call, and every send goes through the
// database's atomic claim. See docs/your-experience-wanted.md.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }
  if (!hasSmtpConfig()) {
    return NextResponse.json({ error: "Email is not configured (missing SMTP settings)" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  try {
    const report = await runExperienceTick(new SupabaseExperienceStore(supabase), new SmtpInvitationMailer(supabase), new Date());
    // Counts only -- no member or question details in logs/responses.
    const summary = {
      status: report.status,
      wave: report.wave
        ? { id: report.wave.id, planned: report.wave.planned, inserted: report.wave.inserted, skipped: report.wave.skipped }
        : null,
      expired: report.expired,
      staleToUnknown: report.staleToUnknown,
      sent: report.sent,
      retried: report.retried,
      unknown: report.unknown,
      dropped: report.dropped,
    };
    console.log("[experience-cron]", JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[experience-cron] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Tick failed" }, { status: 500 });
  }
}
