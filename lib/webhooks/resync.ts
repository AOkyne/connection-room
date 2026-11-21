// "Resync registrations": an admin re-sends everyone currently registered for an event to Workshop Ops,
// for example after a period when the sync was down. Workshop Ops adds new people and updates existing
// ones; it never creates a second copy of someone it already has.
import { getAuthHeader } from "./auth-header";
import type { WorkshopRegistration } from "./workshop-webhook";

const PROXY_URL = "/api/webhooks/workshop-ops";
const BATCH_SIZE = 100;   // the proxy accepts at most 200 per request

export function toResyncBatches<T>(items: T[], size = BATCH_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface ResyncBatchResult {
  ok: boolean;
  status: number;
  created?: number;
  updated?: number;
  errors?: number;
  message?: string;
}

export interface ResyncSummary {
  ok: boolean;
  sent: number;
  created: number;
  updated: number;
  failed: number;
  message: string;
}

/** Turns the per-batch answers into one result and a plain-English message. */
export function summarizeResync(sent: number, batches: ResyncBatchResult[]): ResyncSummary {
  const created = batches.reduce((s, b) => s + (b.created ?? 0), 0);
  const updated = batches.reduce((s, b) => s + (b.updated ?? 0), 0);
  const failed = batches.reduce((s, b) => s + (b.errors ?? 0), 0);
  const firstError = batches.find((b) => !b.ok);
  if (sent === 0) return { ok: true, sent, created, updated, failed, message: "Nobody is registered for this event yet, so there is nothing to send." };
  if (firstError) {
    const why = firstError.status === 404
      ? "Workshop Ops has no workshop for this event yet (only in-person and hybrid events are sent)."
      : firstError.status === 401 || firstError.status === 403
        ? "You need to be signed in with a real admin account to send this."
        : firstError.message || `Workshop Ops answered with an error (${firstError.status}).`;
    return { ok: false, sent, created, updated, failed, message: why };
  }
  const note = failed ? ` ${failed} could not be saved; check Workshop Ops.` : "";
  return { ok: failed === 0, sent, created, updated, failed, message: `Sent ${sent} registration${sent === 1 ? "" : "s"}: ${created} added, ${updated} already there.${note}` };
}

export async function resyncRegistrationsToWorkshopOps(
  eventId: string,
  eventTitle: string,
  eventDate: string,
  registrations: WorkshopRegistration[]
): Promise<ResyncSummary> {
  if (registrations.length === 0) return summarizeResync(0, []);
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { ok: false, sent: 0, created: 0, updated: 0, failed: 0, message: "You need to be signed in with a real admin account (not the demo admin) to send this." };
  }
  const results: ResyncBatchResult[] = [];
  for (const batch of toResyncBatches(registrations)) {
    try {
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ action: "registrations", payload: { eventId, eventTitle, eventDate, registrations: batch } }),
      });
      const body = await res.json().catch(() => ({}));
      results.push({
        ok: res.ok,
        status: res.status,
        created: body.created,
        updated: body.updated,
        errors: Array.isArray(body.errors) ? body.errors.length : 0,
        message: typeof body.error === "string" ? body.error : undefined,
      });
    } catch {
      results.push({ ok: false, status: 0, message: "Could not reach the server. Check your connection and try again." });
    }
  }
  return summarizeResync(registrations.length, results);
}
