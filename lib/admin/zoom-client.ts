import { supabase } from "@/lib/supabase/client";

// Calls /api/admin/zoom/create-meeting (server-side, holds the Zoom
// credentials) to auto-generate a join link for an online/hybrid event.
// Never blocks event creation on failure -- a missing Zoom link is
// recoverable (admin can paste one in manually later), an event that
// silently never got created because Zoom hiccuped is not.
export async function createZoomMeetingLink(
  title: string,
  startAtISO: string,
  endAtISO: string | undefined,
  showToast: (message: string, type: "success" | "error") => void,
  timezone?: string
): Promise<string | undefined> {
  if (!supabase) return undefined;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return undefined;

    const durationMinutes =
      endAtISO && startAtISO
        ? Math.max(15, Math.round((new Date(endAtISO).getTime() - new Date(startAtISO).getTime()) / 60000))
        : 60;

    const response = await fetch("/api/admin/zoom/create-meeting", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ topic: title || "Connection Room Event", startAt: startAtISO, durationMinutes, timezone }),
    });

    if (!response.ok) {
      console.error("Zoom meeting creation failed:", await response.text());
      showToast("Couldn't auto-create a Zoom link — you can add one manually.", "error");
      return undefined;
    }

    const { meeting } = await response.json();
    return meeting.joinUrl as string;
  } catch (err) {
    console.error("Error creating Zoom meeting link:", err);
    showToast("Couldn't auto-create a Zoom link — you can add one manually.", "error");
    return undefined;
  }
}

// Zoom join URLs look like https://us02web.zoom.us/j/{meetingId}?pwd=...
// Kept in sync with lib/zoom.ts's server-side extractZoomMeetingId -- this
// one has no server-only imports so it's safe to use from a client component.
function extractZoomMeetingId(joinUrl: string | undefined): string | null {
  if (!joinUrl) return null;
  const match = joinUrl.match(/\/j\/(\d+)/);
  return match ? match[1] : null;
}

// Best-effort cleanup when an event with an auto-created Zoom meeting is
// deleted. Never throws -- a leftover Zoom meeting is harmless clutter, not
// a reason to block or fail the event deletion itself.
export async function deleteZoomMeetingForEvent(onlineUrl: string | undefined): Promise<void> {
  const meetingId = extractZoomMeetingId(onlineUrl);
  if (!meetingId || !supabase) return;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    const response = await fetch("/api/admin/zoom/delete-meeting", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ meetingId }),
    });

    if (!response.ok) {
      console.warn("Could not delete Zoom meeting (leaving it in place):", await response.text());
    }
  } catch (err) {
    console.warn("Error deleting Zoom meeting (leaving it in place):", err);
  }
}
