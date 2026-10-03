// Signed, purpose-bound tokens for the invitation email's unsubscribe link.
// The token identifies WHO to unsubscribe from question invitations and
// nothing else: it's not a login, can't read anything, and its only use
// is the opt-out POST (a GET only shows a confirmation page, so link
// scanners can't unsubscribe anyone).
//
// Secret: EXPERIENCE_TOKEN_SECRET if set, otherwise derived from the
// service-role key (server-only either way).

import { createHmac, timingSafeEqual } from "crypto";

const PURPOSE = "experience-unsubscribe:v1";

function secret(): string {
  const s = process.env.EXPERIENCE_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("No token secret configured");
  return s;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(`${PURPOSE}:${payload}`).digest("base64url");
}

export function createUnsubscribeToken(userId: string, key: string = secret()): string {
  const payload = Buffer.from(userId, "utf8").toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

/** Returns the user id, or null if the token is malformed or forged. */
export function verifyUnsubscribeToken(token: string | null | undefined, key: string = secret()): string | null {
  if (!token || typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload, key);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const userId = Buffer.from(payload, "base64url").toString("utf8");
  return /^[0-9a-f-]{36}$/i.test(userId) ? userId : null;
}
