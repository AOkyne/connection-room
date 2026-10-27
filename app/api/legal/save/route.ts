import { NextRequest, NextResponse } from "next/server";
import { resolveLegalActor, saveLegalDraft } from "@/lib/legal/server";
import { isLegalSlug } from "@/lib/legal/seed";

export async function POST(request: NextRequest) {
  const actor = await resolveLegalActor(request);
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });

  let body: { slug?: unknown; html?: unknown; draftRev?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!isLegalSlug(body.slug) || typeof body.html !== "string" || typeof body.draftRev !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = await saveLegalDraft(actor, body.slug, body.html, body.draftRev);
  if (!result.ok) return NextResponse.json({ error: result.error, conflict: result.conflict }, { status: result.status });
  return NextResponse.json(result);
}
