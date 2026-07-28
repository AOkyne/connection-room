// Server-side .ics (RFC 5545) generator for calendar-invite email
// attachments. Distinct from the client-only generator in
// app/app/events/page.tsx (which uses Blob/window and is fine for a
// one-off browser download) -- this one needs to run in a Node API
// route, use the event's real duration instead of a hardcoded 1 hour,
// and properly escape/CRLF the output since it's going out as an email
// attachment rather than a same-tab download a user immediately opens.

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export interface BuildEventIcsParams {
  uid: string;
  title: string;
  description?: string;
  startAt: string; // ISO 8601
  durationMinutes: number;
  joinUrl: string;
}

export function buildEventIcs(params: BuildEventIcsParams): string {
  const start = new Date(params.startAt);
  const end = new Date(start.getTime() + params.durationMinutes * 60_000);

  const descriptionParts = [params.description, `Join Zoom Meeting: ${params.joinUrl}`].filter(
    (part): part is string => !!part
  );

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Connection Room//Event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${params.uid}@theconnectionroom.com`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `DTSTART:${formatIcsDate(start.toISOString())}`,
    `DTEND:${formatIcsDate(end.toISOString())}`,
    `SUMMARY:${escapeIcsText(params.title)}`,
    `DESCRIPTION:${escapeIcsText(descriptionParts.join("\n\n"))}`,
    `LOCATION:${escapeIcsText(params.joinUrl)}`,
    `URL:${params.joinUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}
