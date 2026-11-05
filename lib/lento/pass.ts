// Verifying Lento's signed entry pass (the receiving half of the
// Lento -> Connection Room handoff). Lento signs a short-lived JWT with its
// private Ed25519 key; we hold only the public key (LENTO_PASS_PUBLIC_KEY,
// SPKI PEM: "-----BEGIN PUBLIC KEY-----..."). Pure apart from the clock and
// the one-time-use store, which are passed in, so every rule is testable.

import { createHash } from "crypto";
import { importSPKI, jwtVerify, type CryptoKey, type KeyObject } from "jose";

/** Rooms a pass can open. Any other value in the claim is ignored. */
export type Room = "connection" | "lento";
export const KNOWN_ROOMS: readonly Room[] = ["connection", "lento"];

/** The known rooms in a claim, deduplicated; null if the claim isn't an array of strings. */
export function parseRooms(value: unknown): Room[] | null {
  if (!Array.isArray(value) || value.length > 20 || !value.every((v) => typeof v === "string")) return null;
  return KNOWN_ROOMS.filter((r) => value.includes(r));
}

export interface PassClaims {
  sub: string;
  rooms: Room[];
  iat: number;
  exp: number;
  jti: string;
}

/** Why a pass was refused -- for the admin diagnostics count only, never shown to the visitor. */
export type PassFailure = "missing" | "invalid" | "expired" | "replayed" | "misconfigured";

export const PASS_ISSUER = "lento";
export const PASS_AUDIENCE = "connection-room";
export const CLOCK_TOLERANCE_S = 30;
/** Lento issues passes valid for about two minutes; anything longer is refused. */
export const MAX_PASS_LIFETIME_S = 180;

const ID_RE = /^[A-Za-z0-9._~:-]{8,200}$/;

export async function loadPassKey(pem: string | undefined): Promise<CryptoKey | KeyObject | null> {
  if (!pem) return null;
  try {
    // Vercel env values sometimes arrive with literal "\n" instead of newlines.
    return await importSPKI(pem.replace(/\\n/g, "\n").trim(), "EdDSA");
  } catch {
    return null;
  }
}

export async function verifyPass(
  token: string | null | undefined,
  key: CryptoKey | KeyObject | null,
  nowMs: number = Date.now()
): Promise<{ ok: true; claims: PassClaims } | { ok: false; reason: PassFailure }> {
  if (!key) return { ok: false, reason: "misconfigured" };
  if (!token || typeof token !== "string" || token.length > 4096) return { ok: false, reason: "missing" };

  let payload: Record<string, unknown>;
  try {
    const result = await jwtVerify(token, key, {
      algorithms: ["EdDSA"], // refuses none, HS256 and everything else
      issuer: PASS_ISSUER,
      audience: PASS_AUDIENCE,
      clockTolerance: CLOCK_TOLERANCE_S,
      requiredClaims: ["sub", "rooms", "iat", "exp", "jti", "iss", "aud"],
      currentDate: new Date(nowMs),
    });
    payload = result.payload as Record<string, unknown>;
  } catch (err) {
    const code = (err as { code?: string }).code;
    return { ok: false, reason: code === "ERR_JWT_EXPIRED" ? "expired" : "invalid" };
  }

  const { sub, iat, exp, jti, aud } = payload;
  const rooms = parseRooms(payload.rooms);
  const now = Math.floor(nowMs / 1000);
  if (typeof sub !== "string" || !ID_RE.test(sub)) return { ok: false, reason: "invalid" };
  if (typeof jti !== "string" || !ID_RE.test(jti)) return { ok: false, reason: "invalid" };
  // A pass that names no room we know opens nothing.
  if (!rooms || rooms.length === 0) return { ok: false, reason: "invalid" };
  if (aud !== PASS_AUDIENCE) return { ok: false, reason: "invalid" }; // a single audience, not a list
  if (typeof iat !== "number" || typeof exp !== "number" || !Number.isInteger(iat) || !Number.isInteger(exp)) {
    return { ok: false, reason: "invalid" };
  }
  if (iat > now + CLOCK_TOLERANCE_S) return { ok: false, reason: "invalid" };
  if (exp <= iat || exp - iat > MAX_PASS_LIFETIME_S) return { ok: false, reason: "invalid" };

  return { ok: true, claims: { sub, rooms, iat, exp, jti } };
}

export const ROOM_PATHS: Record<Room, string> = { lento: "/lento-room", connection: "/app" };

/**
 * Where a valid pass lands. Lento may ask for a room (&room=lento or
 * &room=connection); it's honoured only if the pass allows that room, and
 * otherwise ignored. Without a usable request, "lento" wins if allowed.
 * "/app" is The Connection Room's front door, whose normal sign-in still
 * applies: a pass never signs anyone in to the general community.
 */
export function destinationFor(rooms: Room[], requested: string | null | undefined): string {
  const asked = (KNOWN_ROOMS as readonly string[]).includes(requested || "") ? (requested as Room) : null;
  if (asked && rooms.includes(asked)) return ROOM_PATHS[asked];
  return ROOM_PATHS[rooms.includes("lento") ? "lento" : "connection"];
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Records a pass as used. Must be atomic: resolves false if it was already recorded. */
export type RedeemOnce = (jtiHash: string, expiresAt: Date) => Promise<boolean>;

/** Verify, then spend the pass. A pass works once, even under concurrent attempts. */
export async function redeemPass(
  token: string | null | undefined,
  key: CryptoKey | KeyObject | null,
  redeemOnce: RedeemOnce,
  nowMs: number = Date.now()
): Promise<{ ok: true; claims: PassClaims } | { ok: false; reason: PassFailure }> {
  const verified = await verifyPass(token, key, nowMs);
  if (!verified.ok) return verified;
  // Kept a minute past expiry: after that the pass is refused as expired anyway.
  const keepUntil = new Date((verified.claims.exp + CLOCK_TOLERANCE_S + 60) * 1000);
  const first = await redeemOnce(sha256Hex(verified.claims.jti), keepUntil);
  if (!first) return { ok: false, reason: "replayed" };
  return verified;
}
