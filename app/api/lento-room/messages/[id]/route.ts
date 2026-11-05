import { NextRequest } from "next/server";
import { deleteMessage, editMessage, getThread, reportMessage, resolveRoomActor, setFollow, toggleReaction } from "@/lib/lento/room";
import { json, readBody, refused } from "@/lib/lento/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const actor = await resolveRoomActor(request);
  if (!actor.ok) return refused(actor);
  const { id } = await params;
  const thread = await getThread(actor.supabase, actor.member, id);
  if (!thread) return json({ error: "Not found." }, 404);
  return json(thread);
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const actor = await resolveRoomActor(request);
  if (!actor.ok) return refused(actor);
  const { id } = await params;
  const body = await readBody(request);
  const result = await editMessage(actor.supabase, actor.member, id, body.body);
  return result.ok ? json({ ok: true }) : json({ error: result.error }, result.status);
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const actor = await resolveRoomActor(request);
  if (!actor.ok) return refused(actor);
  const { id } = await params;
  const result = await deleteMessage(actor.supabase, actor.member, id);
  return result.ok ? json({ ok: true }) : json({ error: result.error }, result.status);
}

// action: "react" (kind), "follow", "unfollow", "report" (reason).
export async function POST(request: NextRequest, { params }: Ctx) {
  const actor = await resolveRoomActor(request);
  if (!actor.ok) return refused(actor);
  const { id } = await params;
  const body = await readBody(request);
  if (body.action === "react") {
    const r = await toggleReaction(actor.supabase, actor.member, id, body.kind);
    return r.ok ? json({ active: r.active }) : json({ error: r.error }, r.status);
  }
  if (body.action === "follow" || body.action === "unfollow") {
    await setFollow(actor.supabase, actor.member, id, body.action === "follow");
    return json({ ok: true });
  }
  if (body.action === "report") {
    const r = await reportMessage(actor.supabase, actor.member, id, body.reason);
    return r.ok ? json({ ok: true }) : json({ error: r.error }, r.status);
  }
  return json({ error: "Unknown action" }, 400);
}
