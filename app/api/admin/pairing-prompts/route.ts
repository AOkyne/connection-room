import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

const CATEGORIES = ["thoughtful", "funny", "controversial", "playful", "deep"] as const;
type Category = (typeof CATEGORIES)[number];

function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

// The weekly pairing icebreaker list (migration 100). pairing_prompts has
// no member-facing RLS policies at all -- every read/write goes through
// this admin-only, service-role route or the weekly-pairings cron.
// Prompts are switched off rather than deleted, so past pairings keep
// pointing at the exact prompt they were given.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("pairing_prompts")
    .select("id, category, prompt_text, is_active, created_at")
    .order("category", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ prompts: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { category?: unknown; promptText?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!isCategory(body.category) || typeof body.promptText !== "string" || !body.promptText.trim()) {
    return NextResponse.json({ error: "A category and prompt text are required" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("pairing_prompts")
    .insert({ category: body.category, prompt_text: body.promptText.trim() })
    .select("id, category, prompt_text, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ prompt: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { id?: unknown; isActive?: unknown; promptText?: unknown; category?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (typeof body.id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") updates.is_active = body.isActive;
  if (typeof body.promptText === "string" && body.promptText.trim()) updates.prompt_text = body.promptText.trim();
  if (isCategory(body.category)) updates.category = body.category;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("pairing_prompts")
    .update(updates)
    .eq("id", body.id)
    .select("id, category, prompt_text, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ prompt: data });
}
