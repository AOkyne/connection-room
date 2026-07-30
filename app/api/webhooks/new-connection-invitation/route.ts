import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasSmtpConfig, sendConnectionInvitationEmail, logEmailSend } from "@/lib/email/send";

// Called by the connections_notify_new_invitation trigger (migration 082)
// via pg_net, fire-and-forget, whenever a new async Guided Connection
// invitation is created (create_connection_invitation(), migration 078).
// Same trust boundary/secret as the sibling new-connection-message and
// new-post-notification webhooks (all "Postgres calling out to our own
// API", distinct from CRON_SECRET's "external service calling in").
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

  const { connectionId, fromUserId, toUserId } = body;
  if (!connectionId || !fromUserId || !toUserId) {
    return NextResponse.json({ error: "Missing connectionId, fromUserId, or toUserId" }, { status: 400 });
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

  const { data: existing } = await supabase
    .from("connection_notification_log")
    .select("id")
    .eq("connection_id", connectionId)
    .eq("notified_user_id", toUserId)
    .eq("notification_type", "invitation_created")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ skipped: "already notified" });
  }

  const { data: inviter, error: inviterError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", fromUserId)
    .single();

  if (inviterError || !inviter) {
    return NextResponse.json({ error: "Inviter profile not found" }, { status: 404 });
  }

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(toUserId);
  const email = userData?.user?.email;
  if (userError || !email) {
    return NextResponse.json({ skipped: "no email on file" });
  }

  await sendConnectionInvitationEmail({
    to: email,
    fromUserName: inviter.display_name,
    appUrl,
  });

  await supabase.from("connection_notification_log").insert({
    connection_id: connectionId,
    notified_user_id: toUserId,
    notification_type: "invitation_created",
  });

  await logEmailSend(supabase, {
    category: "connection_invite",
    to: email,
    subject: `${inviter.display_name} would like to connect with you`,
    recipientUserId: toUserId,
  });

  return NextResponse.json({ sent: true });
}
