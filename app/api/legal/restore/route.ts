import { NextRequest, NextResponse } from "next/server";
import { resolveLegalActor, restoreLegalVersion } from "@/lib/legal/server";

// Makes an earlier version the current draft again (as a new, tracked save).
export async function POST(request: NextRequest) {
  const actor = await resolveLegalActor(request);
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });

  let body: { versionId?: unknown; draftRev?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (typeof body.versionId !== "string" || typeof body.draftRev !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = await restoreLegalVersion(actor, body.versionId, body.draftRev);
  if (!result.ok) return NextResponse.json({ error: result.error, conflict: result.conflict }, { status: result.status });
  return NextResponse.json(result);
}
