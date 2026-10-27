import { NextRequest, NextResponse } from "next/server";
import { publishLegalPage, resolveLegalActor } from "@/lib/legal/server";
import { isLegalSlug } from "@/lib/legal/seed";

// Admin only (publishLegalPage refuses reviewers): the draft becomes the
// public page and the new baseline for tracked changes.
export async function POST(request: NextRequest) {
  const actor = await resolveLegalActor(request);
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });

  let body: { slug?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!isLegalSlug(body.slug)) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const result = await publishLegalPage(actor, body.slug);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
