import { NextResponse } from "next/server";
import type { RoomActor } from "./room";

// Shared response helpers for /api/lento-room/*: never cached, never
// sending a referrer, and the same plain errors for every refusal.
const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: HEADERS });
}

export function refused(actor: Extract<RoomActor, { ok: false }>) {
  if (actor.reason === "restricted") return json({ error: "restricted" }, 403);
  if (actor.reason === "misconfigured") return json({ error: "The room isn’t available right now." }, 500);
  return json({ error: "no_session" }, 401);
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}
