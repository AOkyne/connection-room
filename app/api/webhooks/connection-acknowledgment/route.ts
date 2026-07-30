import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasSmtpConfig, sendConnectionLifecycleEmail, logEmailSend } from "@/lib/email/send";

// Called by submit_acknowledgment() (migration 083) via pg_net, fire-and-
// forget, whenever a member sends an acknowledgment on a revealed round.
// Only notifies the recipient -- the sender is, by definition, online
// right now. Same trust boundary/secret as the sibling connection
// webhooks.
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const webhookSecret = process.env.POST_NOTIFICATION_WEBHOOK_SECRET;
  if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { roundId, connectionId, notifyUserId, fromUserId } = body;
  if (!roundId || !connectionId || !notifyUserId || !fromUserId) {
    return NextResponse.json(
      { error: "Missing roundId, connectionId, notifyUserId, or fromUserId" },
      { status: 400 }
    );
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
  const notificationType = `acknowledgment:${roundId}:${fromUserId}`;

  const { data: existing } = await supabase
    .from("connection_notification_log")
    .select("id")
    .eq("connection_id", connectionId)
    .eq("notified_user_id", notifyUserId)
    .eq("notification_type", notificationType)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ skipped: "already notified" });
  }

  const { data: fromProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", fromUserId)
    .single();

  const fromName = fromProfile?.display_name || "Your connection";

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(notifyUserId);
  const email = userData?.user?.email;
  if (userError || !email) {
    return NextResponse.json({ skipped: "no email on file" });
  }

  const subject = `${fromName} acknowledged what you shared`;
  await sendConnectionLifecycleEmail({
    to: email,
    subject,
    paragraphs: [
      `${fromName} left a short acknowledgment on what you shared in your guided connection.`,
      "Take a look whenever you have space.",
    ],
    appUrl: `${appUrl}/app/connections/${connectionId}`,
  });

  await supabase.from("connection_notification_log").insert({
    connection_id: connectionId,
    notified_user_id: notifyUserId,
    notification_type: notificationType,
  });

  await logEmailSend(supabase, {
    category: "connection_lifecycle",
    to: email,
    subject,
    recipientUserId: notifyUserId,
  });

  return NextResponse.json({ sent: true });
}
