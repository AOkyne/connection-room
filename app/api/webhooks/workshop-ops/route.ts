import { NextRequest, NextResponse } from "next/server";

// Proxies requests to the Workshop Ops app so WORKSHOP_API_KEY never ships to
// the browser. lib/webhooks/*.ts call this route instead of workshops.trevorjamesla.com
// directly.

const ENDPOINTS: Record<string, string> = {
  create: "https://workshops.trevorjamesla.com/api/workshops",
  update: "https://workshops.trevorjamesla.com/api/workshops-update",
  delete: "https://workshops.trevorjamesla.com/api/workshops-delete",
  registrations: "https://workshops.trevorjamesla.com/api/registrations",
};

export async function POST(request: NextRequest) {
  try {
    const { action, payload } = await request.json();

    const url = ENDPOINTS[action];
    if (!url) {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const apiKey = process.env.WORKSHOP_API_KEY;
    if (!apiKey) {
      console.error("[workshop-ops proxy] WORKSHOP_API_KEY is not configured");
      return NextResponse.json({ error: "Workshop API not configured" }, { status: 500 });
    }

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
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
