import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { isValidTimeZone } from "@/lib/experience/time";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const [{ data: prefs }, { data: topics }, { data: profile }] = await Promise.all([
    auth.supabase.from("experience_preferences").select("*").eq("user_id", auth.userId).maybeSingle(),
    auth.supabase.from("experience_topics").select("slug, label, sensitive").order("sort_order"),
    auth.supabase.from("profiles").select("notification_frequency").eq("user_id", auth.userId).maybeSingle(),
  ]);
  return NextResponse.json({
    prefs: {
      optedOut: !!prefs?.opted_out,
      paused: !!prefs?.paused,
      topics: prefs?.topics ?? null,
      timezone: prefs?.timezone ?? null,
    },
    topics: topics || [],
    notificationsOff: profile?.notification_frequency === "off",
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => ({}));
  const { data: topicRows } = await auth.supabase.from("experience_topics").select("slug");
  const valid = new Set((topicRows || []).map((t) => t.slug));

  let topics: string[] | null = null;
  if (Array.isArray(body.topics)) topics = [...new Set(body.topics.filter((t: unknown) => typeof t === "string" && valid.has(t)))] as string[];
  const timezone = typeof body.timezone === "string" && isValidTimeZone(body.timezone) ? body.timezone : null;

  const { error } = await auth.supabase.from("experience_preferences").upsert(
    {
      user_id: auth.userId,
      opted_out: body.optedOut === true,
      paused: body.paused === true,
      topics,
      timezone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) return NextResponse.json({ error: "Couldn't save your preferences." }, { status: 500 });
  await auth.supabase.from("experience_audit").insert({
    actor_id: auth.userId,
    action: "member_preferences_updated",
    detail: { optedOut: body.optedOut === true, paused: body.paused === true, topicCount: topics?.length ?? null },
  });
  return NextResponse.json({ ok: true });
}
