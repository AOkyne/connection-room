import { NextRequest, NextResponse } from "next/server";
import { destinationFor, loadPassKey, redeemPass, sha256Hex, type PassFailure } from "@/lib/lento/pass";
import { createSessionValue, roomSecret, ROOM_COOKIE, sessionCookieOptions } from "@/lib/lento/session";
import { serviceClient } from "@/lib/lento/room";

export const dynamic = "force-dynamic";

// Entry from the Lento app: /enter?pass=<signed one-time pass>&room=lento|connection.
// Verifies the pass (Ed25519, issuer lento, audience connection-room, about
// two minutes, once only), sets the 24-hour session (sub + rooms) and
// redirects straight away, so the pass leaves the address bar. Every
// failure goes to the same friendly page with no reason given. Nothing
// about the pass is logged; only an outcome word is counted for the admin
// diagnostics panel.

const NO_REFERRER = { "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" };

function redirect(request: NextRequest, path: string) {
  const res = NextResponse.redirect(new URL(path, request.nextUrl.origin), 302);
  for (const [k, v] of Object.entries(NO_REFERRER)) res.headers.set(k, v);
  return res;
}

async function count(outcome: string) {
  const supabase = serviceClient();
  if (supabase) await supabase.from("lento_room_entry_events").insert({ outcome });
}

export async function GET(request: NextRequest) {
  const fail = async (reason: PassFailure) => {
    await count(reason).catch(() => {});
    return redirect(request, "/lento-room/expired");
  };

  const supabase = serviceClient();
  const secret = roomSecret();
  const key = await loadPassKey(process.env.LENTO_PASS_PUBLIC_KEY);
  if (!supabase || !secret || !key) return fail("misconfigured");

  const result = await redeemPass(request.nextUrl.searchParams.get("pass"), key, async (jtiHash, expiresAt) => {
    const now = new Date().toISOString();
    // Housekeeping in the same request; no separate cleanup job.
    await supabase.from("lento_pass_redemptions").delete().lt("expires_at", now);
    // Primary key on the hash: a second (or concurrent) use fails to insert.
    const { error } = await supabase
      .from("lento_pass_redemptions")
      .insert({ jti_hash: jtiHash, expires_at: expiresAt.toISOString() });
    return !error;
  });
  if (!result.ok) return fail(result.reason);

  const { sub, rooms } = result.claims;
  await supabase
    .from("lento_room_members")
    .upsert({ sub_hash: sha256Hex(sub), last_entry_at: new Date().toISOString() }, { onConflict: "sub_hash" });
  await count(`ok_${rooms.join("_")}`).catch(() => {});

  const { value, exp } = createSessionValue(sub, rooms, secret);
  const res = redirect(request, destinationFor(rooms, request.nextUrl.searchParams.get("room")));
  res.cookies.set(ROOM_COOKIE, value, sessionCookieOptions(exp));
  return res;
}
