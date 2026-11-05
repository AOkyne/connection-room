// The Lento Room session: a signed cookie holding only { sub, rooms, exp },
// valid for 24 hours. When it runs out the member re-enters from the Lento
// app, which checks their eligibility again and issues a fresh pass. There
// is deliberately no renewal here, so Lento stays the authority.
//
// Signed with LENTO_ROOM_SESSION_SECRET (The Connection Room's own secret,
// unrelated to Lento's signing key). Separate from, and never touches, the
// normal Connection Room login.

import { createHmac, timingSafeEqual } from "crypto";
import { parseRooms, type Room } from "./pass";

export const ROOM_COOKIE = "__Host-lento_room";
export const ROOM_SESSION_SECONDS = 24 * 60 * 60;

export interface RoomSession {
  sub: string;
  rooms: Room[];
  exp: number; // seconds since epoch
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function roomSecret(): string | null {
  const s = process.env.LENTO_ROOM_SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

export function createSessionValue(sub: string, rooms: Room[], secret: string, nowMs = Date.now()): { value: string; exp: number } {
  const exp = Math.floor(nowMs / 1000) + ROOM_SESSION_SECONDS;
  const payload = Buffer.from(JSON.stringify({ sub, rooms, exp })).toString("base64url");
  return { value: `${payload}.${sign(payload, secret)}`, exp };
}

export function readSessionValue(value: string | undefined | null, secret: string | null, nowMs = Date.now()): RoomSession | null {
  if (!value || !secret) return null;
  const dot = value.indexOf(".");
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(payload, secret));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const rooms = parseRooms(data.rooms);
    if (typeof data.sub !== "string" || !rooms || typeof data.exp !== "number") return null;
    if (data.exp * 1000 <= nowMs) return null;
    if (data.exp * 1000 > nowMs + (ROOM_SESSION_SECONDS + 60) * 1000) return null;
    return { sub: data.sub, rooms, exp: data.exp };
  } catch {
    return null;
  }
}

/** The Lento Room opens only when the session's rooms include "lento". */
export function opensLentoRoom(session: RoomSession | null): session is RoomSession {
  return !!session && session.rooms.includes("lento");
}

export function sessionCookieOptions(exp: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(exp * 1000),
  };
}
