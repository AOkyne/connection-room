import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createZoomMeeting } from "@/lib/zoom";
import { buildEventIcs } from "@/lib/email/ics";
import { hasSmtpConfig, sendBrandedEmail } from "@/lib/email/send";

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

    // Best-effort: email the creating admin a calendar invite for this
    // meeting. Zoom's own calendar-push feature only supports Google/
    // Microsoft accounts, not iCloud, so meetings created via this
    // server-to-server API never reach an iCloud-backed calendar
    // automatically -- an .ics attachment they can accept with one tap
    // is the closest equivalent. A failure here must never fail the
    // meeting-creation response itself; the Zoom meeting already exists
    // and the event's onlineUrl save shouldn't be blocked by an email hiccup.
    if (hasSmtpConfig()) {
      try {
        const { data: userData } = await auth.supabase.auth.admin.getUserById(auth.userId);
        const adminEmail = userData?.user?.email;
        if (adminEmail) {
          const ics = buildEventIcs({
            uid: `zoom-meeting-${meeting.id}`,
            title: topic,
            startAt,
            durationMinutes,
            joinUrl: meeting.joinUrl,
          });
          await sendBrandedEmail({
            to: adminEmail,
            subject: `Calendar invite: ${topic}`,
            paragraphs: [
              `Here's the calendar invite for "${topic}" -- open the attachment to add it to your calendar.`,
              `Join Zoom Meeting: ${meeting.joinUrl}`,
            ],
            appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://community.trevorjamesla.com",
            attachments: [
              {
                filename: "event.ics",
                content: ics,
                contentType: "text/calendar; charset=utf-8; method=PUBLISH",
              },
            ],
          });
        }
      } catch (emailErr) {
        console.warn("Could not send calendar invite email (meeting still created):", emailErr);
      }
    }

    return NextResponse.json({ meeting });
  } catch (err) {
    console.error("Error creating Zoom meeting:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create Zoom meeting" },
      { status: 500 }
    );
  }
}
