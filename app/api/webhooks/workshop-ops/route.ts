import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import {
  ADMIN_ONLY_ACTIONS,
  PROXY_ENDPOINTS,
  cleanPayload,
  isProxyAction,
  memberRegistrationRequest,
  ownRegistrationPayload,
} from "@/lib/webhooks/workshop-ops-guard";

export const dynamic = "force-dynamic";

// Forwards event and registration changes to the Workshop Ops app so
// WORKSHOP_API_KEY never ships to the browser.
//
// Because this route holds that key it must NOT be open to the public: every
// call needs a signed-in session (Bearer token). Creating, updating and
// deleting workshops is admin-only. Members may only send their own
// registration. Payloads are trimmed to the fields Workshop Ops understands.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    const action = body?.action;
    if (!isProxyAction(action)) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const { data: profile } = await auth.supabase
      .from("profiles")
      .select("role")
      .eq("user_id", auth.userId)
      .maybeSingle();
    const isAdmin = profile?.role === "admin";

    if (ADMIN_ONLY_ACTIONS.has(action) && !isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    let outgoing: Record<string, unknown>;

    if (action === "registrations" && !isAdmin) {
      // Members: ignore the list the browser sent (it holds everyone's registrations and could be
      // forged). Look up this member's own registration and send only that.
      const reqInfo = memberRegistrationRequest(body?.payload);
      if (!reqInfo.ok) {
        return NextResponse.json({ error: reqInfo.error }, { status: 400 });
      }
      const { data: row } = await auth.supabase
        .from("event_registrations")
        .select("id, name, email, status, registered_at")
        .eq("event_id", reqInfo.eventId)
        .eq("profile_id", auth.userId)
        .maybeSingle();
      const own = row ? ownRegistrationPayload(reqInfo, row) : null;
      if (!own) {
        return NextResponse.json({ error: "You can only send your own registration" }, { status: 403 });
      }
      outgoing = own;
    } else {
      const checked = cleanPayload(action, body?.payload);
      if (!checked.ok) {
        return NextResponse.json({ error: checked.error }, { status: 400 });
      }
      outgoing = checked.payload;
    }

    const apiKey = process.env.WORKSHOP_API_KEY;
    if (!apiKey) {
      console.error("[workshop-ops proxy] WORKSHOP_API_KEY is not configured");
      return NextResponse.json({ error: "Workshop API not configured" }, { status: 500 });
    }

    const upstream = await fetch(PROXY_ENDPOINTS[action], {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(outgoing),
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" },
    });
  } catch (error) {
    console.error("[workshop-ops proxy] Error:", error);
    return NextResponse.json({ error: "Proxy request failed" }, { status: 500 });
  }
}
