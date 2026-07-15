// Server-side only. Uses Zoom's Server-to-Server OAuth (account_credentials
// grant) -- appropriate here because this app creates meetings under a
// single Zoom account (Trevor's), not on behalf of many individually
// authorizing users. Never import this from client components; the client
// secret must never reach the browser.

interface ZoomTokenResponse {
  access_token: string;
  expires_in: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getZoomAccessToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Zoom credentials are not configured (ZOOM_ACCOUNT_ID/ZOOM_CLIENT_ID/ZOOM_CLIENT_SECRET)");
  }

  // Reuse the token until shortly before it expires instead of requesting a
  // fresh one on every meeting creation -- S2S tokens are valid for 1 hour.
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${basicAuth}` },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Zoom token request failed (${response.status}): ${body}`);
  }

  const data: ZoomTokenResponse = await response.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

export interface CreateZoomMeetingParams {
  topic: string;
  startAt: string; // ISO 8601
  durationMinutes: number;
  timezone?: string;
}

export interface ZoomMeeting {
  id: number;
  joinUrl: string;
  startUrl: string;
}

export async function createZoomMeeting(params: CreateZoomMeetingParams): Promise<ZoomMeeting> {
  const token = await getZoomAccessToken();

  const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: params.topic,
      type: 2, // scheduled meeting
      start_time: params.startAt,
      duration: params.durationMinutes,
      timezone: params.timezone || "America/Los_Angeles",
      settings: {
        join_before_host: true,
        waiting_room: false,
        approval_type: 2, // no registration required
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Zoom meeting creation failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return { id: data.id, joinUrl: data.join_url, startUrl: data.start_url };
}

export async function deleteZoomMeeting(meetingId: string): Promise<void> {
  const token = await getZoomAccessToken();

  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  // 404 means it's already gone (e.g. manually deleted in Zoom) -- treat as
  // success rather than an error, since the end state (no meeting) matches.
  if (!response.ok && response.status !== 404) {
    const body = await response.text();
    throw new Error(`Zoom meeting deletion failed (${response.status}): ${body}`);
  }
}

// Zoom join URLs look like https://us02web.zoom.us/j/{meetingId}?pwd=...
export function extractZoomMeetingId(joinUrl: string | undefined): string | null {
  if (!joinUrl) return null;
  const match = joinUrl.match(/\/j\/(\d+)/);
  return match ? match[1] : null;
}
