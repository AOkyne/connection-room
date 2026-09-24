import { supabase } from "@/lib/supabase/client";

export interface SendBroadcastEmailResult {
  sentCount: number;
  failedCount: number;
  errors: string[];
  // Explicit, unambiguous success signal -- previously callers checked
  // failedCount === 0, but early-error branches couldn't know the real
  // recipient count, which made a failed "All Members" send look like a
  // success. Confirmed live as the cause of "I click Send and nothing
  // happens".
  success: boolean;
}

// Recipients per request. Measured live: SMTP2GO takes ~4s per message
// from a Vercel function, and a 60s-capped request managed only ~20 of a
// 134-member "All Members" send before being killed (504) -- no amount of
// in-request concurrency fixes that at scale. Small chunks keep every
// request comfortably inside the limit (5 x ~4s = ~20s worst case, even
// if the mail server serializes them) no matter how big the list gets.
const RECIPIENTS_PER_REQUEST = 5;
// Chunk requests in flight at once -- two separate serverless
// invocations, so the total send time roughly halves without any single
// request getting closer to its own time limit.
const PARALLEL_REQUESTS = 2;

async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

// chunkError is set only when the whole request failed (timeout, server
// error, network) -- as opposed to individual recipients failing inside a
// request that otherwise succeeded, which come back in `errors`.
interface ChunkResult extends SendBroadcastEmailResult {
  chunkError?: string;
}

async function sendChunk(
  accessToken: string,
  recipientIds: string[],
  subject: string,
  bodyHtml: string,
  broadcastBatchId: string
): Promise<ChunkResult> {
  try {
    const response = await fetch("/api/admin/broadcast-email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ recipientIds, subject, bodyHtml, broadcastBatchId }),
    });

    // A timed-out or crashed function returns Vercel's own non-JSON error
    // page -- parsing that as JSON is exactly what produced Safari's
    // cryptic "The string did not match the expected pattern." Read as
    // text first so a failure surfaces as a real, readable status instead.
    const raw = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }

    if (!response.ok || !data) {
      const reason =
        response.status === 504
          ? "the server timed out"
          : data?.error || `the server returned an error (HTTP ${response.status})`;
      return { sentCount: 0, failedCount: recipientIds.length, errors: [], success: false, chunkError: reason };
    }

    const errors = (data.results || [])
      .filter((r: { success: boolean }) => !r.success)
      .map((r: { id: string; error?: string }) => `${r.id}: ${r.error || "unknown error"}`);

    return { sentCount: data.sentCount, failedCount: data.failedCount, errors, success: errors.length === 0 };
  } catch (err) {
    return {
      sentCount: 0,
      failedCount: recipientIds.length,
      errors: [],
      success: false,
      chunkError: err instanceof Error ? err.message : "a network error",
    };
  }
}

// Sends a broadcast to an explicit recipient list in small chunks, one
// request per chunk, all sharing a single broadcastBatchId so the whole
// send still shows up as ONE campaign in Email History (and so "Resend to
// unsent recipients" can find exactly who's missing if anything fails).
// A failed chunk doesn't stop the rest -- more people get the email, and
// the resend tool picks up whoever was missed.
export async function sendBroadcastEmail(
  recipientIds: string[],
  subject: string,
  bodyHtml: string,
  onProgress?: (processed: number, total: number) => void
): Promise<SendBroadcastEmailResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      sentCount: 0,
      failedCount: recipientIds.length,
      errors: ["Not signed in with a real admin account. Admin actions require a real Supabase sign-in, not a demo session."],
      success: false,
    };
  }

  const broadcastBatchId = crypto.randomUUID();
  const chunks: string[][] = [];
  for (let i = 0; i < recipientIds.length; i += RECIPIENTS_PER_REQUEST) {
    chunks.push(recipientIds.slice(i, i + RECIPIENTS_PER_REQUEST));
  }

  const totals: SendBroadcastEmailResult = { sentCount: 0, failedCount: 0, errors: [], success: true };
  let processed = 0;
  let nextChunk = 0;
  const chunkFailures: string[] = [];

  const worker = async () => {
    while (nextChunk < chunks.length) {
      const chunk = chunks[nextChunk++];
      const result = await sendChunk(accessToken, chunk, subject, bodyHtml, broadcastBatchId);
      totals.sentCount += result.sentCount;
      totals.failedCount += result.failedCount;
      // Per-recipient errors (e.g. "No email on file") are listed as-is; a
      // whole-chunk failure is summarized once below instead of repeating
      // the same reason for every recipient in it.
      if (result.chunkError) chunkFailures.push(result.chunkError);
      totals.errors.push(...result.errors);
      processed += chunk.length;
      onProgress?.(processed, recipientIds.length);
    }
  };

  await Promise.all(Array.from({ length: Math.min(PARALLEL_REQUESTS, chunks.length) }, worker));

  if (chunkFailures.length > 0) {
    const uniqueReasons = Array.from(new Set(chunkFailures)).join("; ");
    totals.errors.unshift(
      `${chunkFailures.length} group${chunkFailures.length === 1 ? "" : "s"} of recipients couldn't be sent (${uniqueReasons}). ` +
        `Use "Resend to unsent recipients" above to finish this send without emailing anyone twice.`
    );
  }
  totals.success = totals.errors.length === 0;
  return totals;
}
