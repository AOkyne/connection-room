import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("email_templates")
    .select("id, key, subject, body, sign_off, days_after_onboarding, active, updated_at")
    .order("days_after_onboarding", { ascending: true, nullsFirst: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { id?: unknown; subject?: unknown; body?: unknown; sign_off?: unknown; active?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { id, subject, body: emailBody, sign_off, active } = body;
  if (typeof id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof subject === "string") updates.subject = subject;
  if (typeof emailBody === "string") updates.body = emailBody;
  if (typeof sign_off === "string") updates.sign_off = sign_off;
  if (typeof active === "boolean") updates.active = active;

  const { data, error } = await auth.supabase
    .from("email_templates")
    .update(updates)
    .eq("id", id)
    .select("id, key, subject, body, sign_off, days_after_onboarding, active, updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ template: data });
}
