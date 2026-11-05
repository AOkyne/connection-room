import { NextRequest } from "next/server";
import { listMessages, postMessage, resolveRoomActor, runPromptTick } from "@/lib/lento/room";
import { json, readBody, refused } from "@/lib/lento/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const actor = await resolveRoomActor(request);
  if (!actor.ok) return refused(actor);
  const before = request.nextUrl.searchParams.get("before");
  const after = request.nextUrl.searchParams.get("after");
  // Publishing a due prompt here too means the rhythm keeps going even
  // without an external scheduler; the unique index keeps it to once.
  if (!before && !after) await runPromptTick(actor.supabase).catch(() => []);
  try {
    return json(await listMessages(actor.supabase, actor.member, { before, after }));
  } catch {
    return json({ error: "Couldn’t load the conversation." }, 500);
  }
}

export async function POST(request: NextRequest) {
  const actor = await resolveRoomActor(request);
  if (!actor.ok) return refused(actor);
  const result = await postMessage(actor.supabase, actor.member, await readBody(request));
  if (!result.ok) return json({ error: result.error }, result.status);
  return json({ id: result.id });
}
