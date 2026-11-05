import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { claimNotifications, serviceClient } from "@/lib/lento/room";
import { json } from "@/lib/lento/http";

export const dynamic = "force-dynamic";

// Pulled by Lento (Authorization: Bearer LENTO_NOTIFY_SECRET) to send room
// emails itself: per member, counts only (new replies, replies in followed
// conversations, new weekly topics, digest preference), keyed by
// sha256(sub). Each call returns what's new since the previous call.
export async function POST(request: NextRequest) {
  const secret = process.env.LENTO_NOTIFY_SECRET;
  const given = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (!secret || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return json({ error: "Unauthorized" }, 401);
  }
  const supabase = serviceClient();
  if (!supabase) return json({ error: "Missing configuration" }, 500);
  return json(await claimNotifications(supabase));
}
