import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

// Private edit links for the legal pages: one per outside reviewer (e.g.
// the lawyer), named so their edits are tracked under that name. A link
// can edit drafts but never publish; revoking it stops it immediately.

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase
    .from("legal_edit_links")
    .select("id, token, person_name, created_at, last_used_at, revoked_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ links: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { personName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const personName = typeof body.personName === "string" ? body.personName.trim().slice(0, 80) : "";
  if (!personName) return NextResponse.json({ error: "Enter the person's name." }, { status: 400 });

  const { data, error } = await auth.supabase
    .from("legal_edit_links")
    .insert({ token: randomBytes(24).toString("base64url"), person_name: personName, created_by: auth.userId })
    .select("id, token, person_name, created_at, last_used_at, revoked_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await auth.supabase
    .from("legal_edit_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
