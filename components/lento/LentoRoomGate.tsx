"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/session";
import { LentoRoom, NoAccess } from "./LentoRoom";

// Shown when there's no Lento room session. The host (a Connection Room
// admin) can still come in; anyone else sees the friendly no-access page.
// This decides only what to render -- the server checks every request.
export function LentoRoomGate() {
  const [state, setState] = useState<"checking" | "host" | "none">("checking");
  useEffect(() => {
    const init = async () => {
      const session = await getSession();
      setState(session?.type === "admin" && session.supabaseUserId ? "host" : "none");
    };
    init();
  }, []);
  if (state === "checking") return <div className="min-h-dvh" style={{ background: "#f7f1e8" }} />;
  if (state === "host") return <LentoRoom host />;
  return <NoAccess />;
}
