import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasSmtpConfig, sendPostNotificationEmail } from "@/lib/email/send";

// Called by the posts_notify_new_post trigger (migration 054) via pg_net,
// fire-and-forget, every time a new post is inserted. Not a Vercel cron --
// secured the same Bearer-secret way, but the secret here
// (POST_NOTIFICATION_WEBHOOK_SECRET) is distinct from CRON_SECRET so the
// two trust boundaries (Postgres calling out vs. an external cron trigger
// calling in) can be rotated independently.
export const maxDuration = 60;

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

  const { postId, spaceId, authorId } = body;
  if (!postId || !spaceId || !authorId) {
    return NextResponse.json({ error: "Missing postId, spaceId, or authorId" }, { status: 400 });
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

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("body, author_name")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("name")
    .eq("id", spaceId)
    .single();

  if (spaceError || !space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  const { data: members, error: membersError } = await supabase
    .from("space_memberships")
    .select("user_id")
    .eq("space_id", spaceId)
    .neq("user_id", authorId);

  if (membersError) {
    return NextResponse.json({ error: "Failed to fetch space members" }, { status: 500 });
  }
  if (!members || members.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, failed: 0 });
  }

  const { data: recipientProfiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id")
    .in(
      "user_id",
      members.map((m) => m.user_id)
    )
    .eq("notification_frequency", "immediate");

  if (profilesError) {
    return NextResponse.json({ error: "Failed to fetch recipient preferences" }, { status: 500 });
  }

  const excerpt =
    post.body && post.body.length > 200 ? `${post.body.slice(0, 200)}...` : post.body || "";
  const authorName = post.author_name || "A member";
  const spaceUrl = `${appUrl}/app/spaces/${spaceId}`;

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const recipient of recipientProfiles || []) {
    try {
      const { data: existing } = await supabase
        .from("notification_log")
        .select("id")
        .eq("user_id", recipient.user_id)
        .eq("post_id", postId)
        .eq("notification_type", "immediate")
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(recipient.user_id);
      const email = userData?.user?.email;
      if (userError || !email) {
        skipped++;
        continue;
      }

      await sendPostNotificationEmail({
        to: email,
        spaceName: space.name,
        spaceUrl,
        authorName,
        excerpt,
      });

      await supabase.from("notification_log").insert({
        user_id: recipient.user_id,
        notification_type: "immediate",
        post_id: postId,
      });

      sent++;
    } catch (err) {
      console.error(`Error sending immediate notification to ${recipient.user_id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}
