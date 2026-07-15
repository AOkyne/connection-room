import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { deleteZoomMeeting } from "@/lib/zoom";

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

  const { meetingId } = body;
  if (!meetingId) {
    return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
  }

  try {
    await deleteZoomMeeting(meetingId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting Zoom meeting:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete Zoom meeting" },
      { status: 500 }
    );
  }
}
