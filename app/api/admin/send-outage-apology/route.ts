import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { hasSmtpConfig, sendBrandedEmail } from "@/lib/email/send";

// One-off, hardcoded-recipient send: apologizes to the 10 real signups who
// hit the profile_tagline/PostgREST outage (2026-07-20 05:35 UTC through
// 2026-07-21 16:42 UTC) that kept every one of their save attempts from
// ever succeeding -- confirmed live, all 10 show first_name still null,
// meaning literally nothing they entered was ever persisted. Not a general
// mass-email tool: deliberately takes no recipient list in the request
// body, only ever sends to this fixed set, each individually (not one
// email exposing all 10 addresses to each other), cc'd to Trevor on every
// send per his own request. Safe to delete this route once it's been run.
const RECIPIENTS = [
  "smhalgh@outlook.com",
  "bslupton@gmail.com",
  "richepstein@mac.com",
  "ernyc212@gmail.com",
  "art_spinella@yahoo.com",
  "bear9butch@yahoo.com",
  "iwannasucu209@gmail.com",
  "tsunadebanks@gmail.com",
  "mtm.houdijk@gmail.com",
  "stevegillismoore@gmail.com",
];

const CC_ADDRESS = "trevor@trevorjamesla.com";

const SUBJECT = "Sorry about that — your Connection Room profile is ready when you are";

const PARAGRAPHS = [
  "I wanted to reach out personally about something on our end, not yours.",
  "When you signed up for The Connection Room, you ran into a real technical bug that kept your profile from saving — no matter what you entered, it wouldn't go through. That's on us, and I'm sorry for the frustrating first impression.",
  "The issue is fixed now. If you'd like to give it another try, just click below to pick up right where you left off — it only takes a few minutes, and your spot in the community is still here waiting for you.",
  "If you run into any trouble at all this time, just reply directly to this email. I'll see it and help personally.",
];

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!hasSmtpConfig()) {
    return NextResponse.json({ error: "Email is not configured on the server (missing SMTP settings)" }, { status: 500 });
  }

  const appUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://community.trevorjamesla.com"}/onboarding`;

  const results: Record<string, { sent: boolean; error?: string }> = {};

  for (const email of RECIPIENTS) {
    try {
      await sendBrandedEmail({
        to: email,
        cc: CC_ADDRESS,
        subject: SUBJECT,
        paragraphs: PARAGRAPHS,
        appUrl,
        signOff: "Warm hugs,",
      });
      results[email] = { sent: true };
    } catch (err) {
      results[email] = { sent: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json({ results });
}
