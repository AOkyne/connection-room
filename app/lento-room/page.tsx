import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LentoRoom } from "@/components/lento/LentoRoom";
import { LentoRoomGate } from "@/components/lento/LentoRoomGate";
import { opensLentoRoom, readSessionValue, roomSecret, ROOM_COOKIE } from "@/lib/lento/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Lento Room",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// The private Lento Room. The page itself holds no room content: messages
// come from /api/lento-room, which checks the session on every request.
export default async function LentoRoomPage() {
  const jar = await cookies();
  const session = readSessionValue(jar.get(ROOM_COOKIE)?.value, roomSecret());
  if (opensLentoRoom(session)) return <LentoRoom />;
  return <LentoRoomGate />;
}
