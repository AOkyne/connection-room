import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasSmtpConfig, sendConnectionInviteEmail, logEmailSend } from "@/lib/email/send";

// Called by the connection_messages_notify_new_message trigger (migration
// 077) via pg_net, fire-and-forget, every time a message is inserted into
// connection_messages. Same trust boundary/secret as the sibling
// new-post-notification webhook (both are "Postgres calling out to our own
// API", distinct from CRON_SECRET's "external service calling in").
//
// Only ever emails on the FIRST message of a connection -- there's no real
// presence tracking in this app, so "the recipient isn't available" is
// approximated as "this is a brand-new chat they haven't seen yet". Every
// message after the first is a live back-and-forth the recipient is
// presumably already part of, so it's silently skipped, not an error.
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

  const { connectionId, messageId, fromUserId } = body;
  if (!connectionId || !messageId || !fromUserId) {
    return NextResponse.json(
      { error: "Missing connectionId, messageId, or fromUserId" },
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

  // Only the very first message in a connection triggers an email --
  // count every message in this connection, not just this one.
  const { count: messageCount, error: countError } = await supabase
    .from("connection_messages")
    .select("id", { count: "exact", head: true })
    .eq("connection_id", connectionId);

  if (countError) {
    return NextResponse.json({ error: "Failed to count connection messages" }, { status: 500 });
  }
  if ((messageCount || 0) > 1) {
    return NextResponse.json({ skipped: "not the first message" });
  }

  const { data: message, error: messageError } = await supabase
    .from("connection_messages")
    .select("from_user_name")
    .eq("id", messageId)
    .single();

  if (messageError || !message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const { data: connection, error: connectionError } = await supabase
    .from("connections")
    .select("user_id, partner_id")
    .eq("id", connectionId)
    .single();

  if (connectionError || !connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const recipientId = connection.user_id === fromUserId ? connection.partner_id : connection.user_id;
  if (!recipientId) {
    return NextResponse.json({ error: "Could not resolve recipient" }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from("connection_notification_log")
    .select("id")
    .eq("connection_id", connectionId)
    .eq("notified_user_id", recipientId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ skipped: "already notified" });
  }

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(recipientId);
  const email = userData?.user?.email;
  if (userError || !email) {
    return NextResponse.json({ skipped: "no email on file" });
  }

  await sendConnectionInviteEmail({
    to: email,
    fromUserName: message.from_user_name,
    appUrl,
  });

  await supabase.from("connection_notification_log").insert({
    connection_id: connectionId,
    notified_user_id: recipientId,
  });

  await logEmailSend(supabase, {
    category: "connection_invite",
    to: email,
    subject: `${message.from_user_name} wants to connect with you`,
    recipientUserId: recipientId,
  });

  return NextResponse.json({ sent: true });
}
