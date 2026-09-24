import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasSmtpConfig, sendPasswordResetEmail, logEmailSend } from "@/lib/email/send";

export const dynamic = "force-dynamic";

// Public (signed-out) route behind the "Forgot password?" page.
//
// The reset link is generated here with the admin API
// (auth.admin.generateLink, which only CREATES a link -- it never sends
// anything itself) and delivered through the app's own SMTP2GO setup,
// rather than Supabase's built-in auth emails: those come from a generic
// Supabase sender and are capped at a handful per hour on the default
// email service. This way the email is branded, sent as Trevor, and logged
// in Email History like every other message.
//
// Always returns the same neutral response whether or not an account
// exists for the address, so this can't be used to check who's a member.
const NEUTRAL_RESPONSE = { ok: true };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Repeat requests for the same address inside this window are accepted
// (same neutral response) but don't send another email -- stops the form
// being used to flood someone's inbox.
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

export async function POST(request: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey || !hasSmtpConfig()) {
    return NextResponse.json(
      { error: "Password reset isn't available right now. Please try again later." },
      { status: 500 }
    );
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://community.trevorjamesla.com";

  try {
    const { count: recentCount } = await supabase
      .from("sent_emails")
      .select("id", { count: "exact", head: true })
      .eq("category", "password_reset")
      .eq("to_email", email)
      .gte("sent_at", new Date(Date.now() - RESEND_COOLDOWN_MS).toISOString());
    if ((recentCount || 0) > 0) {
      return NextResponse.json(NEUTRAL_RESPONSE);
    }

    // Errors here (most commonly: no account for this address) are
    // swallowed on purpose -- the caller always gets the same response.
    const { data, error } = await supabase.auth.admin.generateLink({ type: "recovery", email });
    const hashedToken = data?.properties?.hashed_token;
    if (error || !hashedToken) {
      return NextResponse.json(NEUTRAL_RESPONSE);
    }

    // Points at our own page with the token as a parameter, rather than
    // Supabase's verify URL -- the token is only redeemed when the member
    // actually submits a new password there (see /auth/reset-password),
    // so a mail scanner that auto-opens links can't consume it first.
    const resetUrl = `${appUrl}/auth/reset-password?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;

    await sendPasswordResetEmail({ to: email, resetUrl });
    await logEmailSend(supabase, {
      category: "password_reset",
      to: email,
      subject: "Reset your Connection Room password",
      recipientUserId: data.user?.id || null,
    });
  } catch (err) {
    // Logged server-side only -- still the neutral response, so a send
    // failure doesn't reveal that the account exists.
    console.error("[forgot-password] failed:", err);
  }

  return NextResponse.json(NEUTRAL_RESPONSE);
}
