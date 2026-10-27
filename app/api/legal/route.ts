import { NextRequest, NextResponse } from "next/server";
import { loadLegalWorkspace, resolveLegalActor } from "@/lib/legal/server";

// The legal pages workspace: drafts, tracked changes and history. Open to
// signed-in admins and to holders of an active private edit link.
export async function GET(request: NextRequest) {
  const actor = await resolveLegalActor(request);
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });
  try {
    const pages = await loadLegalWorkspace(actor.supabase);
    return NextResponse.json({ actor: { kind: actor.kind, name: actor.name }, pages });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not load." }, { status: 500 });
  }
}
