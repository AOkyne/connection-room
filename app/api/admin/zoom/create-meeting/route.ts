import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createZoomMeeting } from "@/lib/zoom";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { topic, startAt, durationMinutes, timezone } = body;
  if (!topic || !startAt || !durationMinutes) {
    return NextResponse.json(
      { error: "topic, startAt, and durationMinutes are required" },
      { status: 400 }
    );
  }

  try {
    const meeting = await createZoomMeeting({ topic, startAt, durationMinutes, timezone });
    return NextResponse.json({ meeting });
  } catch (err) {
    console.error("Error creating Zoom meeting:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create Zoom meeting" },
      { status: 500 }
    );
  }
}
