import { NextRequest } from "next/server";
import { cleanDisplayName, publicMe, resolveRoomActor } from "@/lib/lento/room";
import { json, readBody, refused } from "@/lib/lento/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const actor = await resolveRoomActor(request);
  if (!actor.ok) return refused(actor);
  return json({ me: publicMe(actor.member, actor.via) });
}

// action: "welcome" (agreements accepted + display name), "prefs", or "read".
export async function POST(request: NextRequest) {
  const actor = await resolveRoomActor(request);
  if (!actor.ok) return refused(actor);
  const body = await readBody(request);
  const { supabase, member } = actor;

  if (body.action === "welcome") {
    const name = cleanDisplayName(body.displayName);
    if (!name) return json({ error: "Choose a name of at least 2 characters." }, 400);
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("lento_room_members")
      .update({ display_name: name, welcomed_at: member.welcomed_at || now })
      .eq("id", member.id)
      .select("*")
      .single();
    return json({ me: publicMe(data || member, actor.via) });
  }

  if (body.action === "prefs") {
    const p = (body.prefs || {}) as Record<string, unknown>;
    const { data } = await supabase
      .from("lento_room_members")
      .update({
        notify_replies: p.replies === true,
        notify_followed: p.followed === true,
        notify_topics: p.topics === true,
        notify_digest: p.digest === true,
      })
      .eq("id", member.id)
      .select("*")
      .single();
    return json({ me: publicMe(data || member, actor.via) });
  }

  if (body.action === "read") {
    await supabase.from("lento_room_members").update({ last_read_at: new Date().toISOString() }).eq("id", member.id);
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
}
