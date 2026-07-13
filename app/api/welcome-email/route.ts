import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasSmtpConfig, sendBrandedEmail } from "@/lib/email/send";
import { renderTemplateBody } from "@/lib/email/render-template";

// Sends the welcome template (editable in the admin dashboard, stored in
// email_templates) to the caller's own verified email only (derived
// server-side from their access token, never client-supplied) so this
// can't be used as an open mail relay by an authenticated-but-malicious
// user. No admin role required — any newly signed-up member can trigger
// their own welcome email.
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user?.email) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  if (!hasSmtpConfig()) {
    return NextResponse.json(
      { error: "Email is not configured on the server (missing SMTP settings)" },
      { status: 500 }
    );
  }

  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("subject, body, sign_off")
    .eq("key", "welcome")
    .eq("active", true)
    .maybeSingle();

  if (templateError || !template) {
    return NextResponse.json({ error: "Welcome email template not found or inactive" }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const firstName = (profile?.display_name || userData.user.email.split("@")[0]).split(" ")[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://community.trevorjamesla.com";

  try {
    await sendBrandedEmail({
      to: userData.user.email,
      subject: template.subject,
      paragraphs: renderTemplateBody(template.body, { firstName, appUrl }),
      appUrl,
      signOff: template.sign_off,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error sending welcome email:", err);
    return NextResponse.json({ error: "Failed to send welcome email" }, { status: 500 });
  }
}
