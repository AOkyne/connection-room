import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/lib/experience/tokens";

export const dynamic = "force-dynamic";

async function optOut(userId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await supabase
    .from("experience_preferences")
    .upsert({ user_id: userId, opted_out: true, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  await supabase.from("experience_audit").insert({ actor_id: userId, action: "member_opted_out", detail: { via: "email_link" } });
}

// One-click unsubscribe (RFC 8058: mail clients POST
// "List-Unsubscribe=One-Click" here) and the confirmation page's form.
// Only a POST changes anything.
export async function POST(request: NextRequest) {
  let token = request.nextUrl.searchParams.get("t");
  const contentType = request.headers.get("content-type") || "";
  if (!token && contentType.includes("application/json")) {
    token = (await request.json().catch(() => ({})))?.token || null;
  } else if (!token && contentType.includes("form")) {
    token = String((await request.formData().catch(() => null))?.get("t") || "") || null;
  }
  const userId = verifyUnsubscribeToken(token);
  if (!userId) return NextResponse.json({ error: "This unsubscribe link isn't valid." }, { status: 400 });
  try {
    await optOut(userId);
  } catch {
    return NextResponse.json({ error: "Couldn't update your preferences. Please try again." }, { status: 500 });
  }
  if (contentType.includes("form")) {
    return NextResponse.redirect(new URL("/experience/unsubscribe?done=1", request.url), { status: 303 });
  }
  return NextResponse.json({ ok: true });
}

// A GET (e.g. a link scanner) never unsubscribes -- it only shows the page.
export async function GET(request: NextRequest) {
  const t = request.nextUrl.searchParams.get("t") || "";
  return NextResponse.redirect(new URL(`/experience/unsubscribe?t=${encodeURIComponent(t)}`, request.url), { status: 302 });
}
