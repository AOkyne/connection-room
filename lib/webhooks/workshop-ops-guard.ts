// Rules for the /api/webhooks/workshop-ops proxy. Kept separate from the route so
// they can be unit-tested without a server.
//
// The proxy holds the real Workshop Ops API key. It must only ever do what the
// caller is allowed to do:
//   create / update / delete a workshop  -> signed-in admins only
//   send registrations                   -> a signed-in member, for themselves only
//                                           (admins may send for anyone, e.g. marking attended)

export type ProxyAction = "create" | "update" | "delete" | "registrations";

export const ADMIN_ONLY_ACTIONS: ReadonlySet<string> = new Set(["create", "update", "delete"]);
const REGISTRATION_STATUSES = new Set(["registered", "interested", "attended", "cancelled", "no_show"]);
const MAX_REGISTRATIONS = 200;

export const PROXY_ENDPOINTS: Record<ProxyAction, string> = {
  create: "https://workshops.trevorjamesla.com/api/workshops",
  update: "https://workshops.trevorjamesla.com/api/workshops-update",
  delete: "https://workshops.trevorjamesla.com/api/workshops-delete",
  registrations: "https://workshops.trevorjamesla.com/api/registrations",
};

export function isProxyAction(value: unknown): value is ProxyAction {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PROXY_ENDPOINTS, value);
}

const str = (v: unknown, max: number): string | undefined =>
  typeof v === "string" ? v.trim().slice(0, max) : undefined;

export type Checked = { ok: true; payload: Record<string, unknown> } | { ok: false; error: string };

/** Keeps only the fields Workshop Ops understands, with sane length limits. */
export function cleanPayload(action: ProxyAction, raw: unknown): Checked {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Missing payload" };
  const p = raw as Record<string, unknown>;
  const eventId = str(p.eventId, 100);

  if (action === "delete") {
    if (!eventId) return { ok: false, error: "eventId is required" };
    return { ok: true, payload: { eventId } };
  }

  if (action === "create" || action === "update") {
    if (!eventId && action === "update") return { ok: false, error: "eventId is required" };
    const out: Record<string, unknown> = {};
    if (eventId) out.eventId = eventId;
    const fields: Array<[string, number]> = [
      ["eventTitle", 200], ["eventDate", 10], ["startTime", 10], ["endTime", 10], ["location", 300], ["description", 5000],
    ];
    for (const [k, max] of fields) {
      if (p[k] !== undefined) {
        const v = str(p[k], max);
        if (v === undefined) return { ok: false, error: `${k} must be text` };
        out[k] = v;
      }
    }
    if (action === "create") {
      if (!out.eventTitle) return { ok: false, error: "eventTitle is required" };
      if (!out.eventDate || !/^\d{4}-\d{2}-\d{2}/.test(String(out.eventDate))) return { ok: false, error: "eventDate must be YYYY-MM-DD" };
    }
    return { ok: true, payload: out };
  }

  // registrations
  if (!Array.isArray(p.registrations)) return { ok: false, error: "registrations must be a list" };
  if (p.registrations.length === 0) return { ok: false, error: "registrations is empty" };
  if (p.registrations.length > MAX_REGISTRATIONS) return { ok: false, error: "Too many registrations in one request" };
  const regs: Array<Record<string, unknown>> = [];
  for (const r of p.registrations) {
    if (!r || typeof r !== "object") return { ok: false, error: "Bad registration" };
    const x = r as Record<string, unknown>;
    const status = str(x.status, 20);
    if (!status || !REGISTRATION_STATUSES.has(status)) return { ok: false, error: "Bad registration status" };
    const email = (str(x.email, 254) ?? "").toLowerCase();
    const name = str(x.name, 200) ?? "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Bad registration email" };
    if (!email && !name) return { ok: false, error: "Registration needs a name or email" };
    regs.push({
      id: str(x.id, 100) ?? "",
      name,
      email,
      phone: str(x.phone, 40) ?? "",
      status,
      registeredAt: str(x.registeredAt, 40) ?? "",
    });
  }
  return {
    ok: true,
    payload: {
      eventId,
      eventTitle: str(p.eventTitle, 200) ?? "",
      eventDate: str(p.eventDate, 10) ?? "",
      registrations: regs,
    },
  };
}

/**
 * For a non-admin member the browser's registration list is NOT trusted. The browser sends the whole
 * event's list (including other people), and could send anything. Instead the server looks up the
 * member's own registration in the database and forwards just that. This pulls the event id (and the
 * title and date, used only to find the right workshop) out of whatever the browser sent.
 */
export function memberRegistrationRequest(raw: unknown): { ok: true; eventId: string; eventTitle: string; eventDate: string } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Missing payload" };
  const p = raw as Record<string, unknown>;
  const eventId = str(p.eventId, 100);
  if (!eventId) return { ok: false, error: "eventId is required" };
  const eventDate = str(p.eventDate, 10) ?? "";
  return { ok: true, eventId, eventTitle: str(p.eventTitle, 200) ?? "", eventDate: /^\d{4}-\d{2}-\d{2}$/.test(eventDate) ? eventDate : "" };
}

export interface OwnRegistrationRow {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  status?: string | null;
  registered_at?: string | null;
}

/** Builds the single registration Workshop Ops receives for a member, from their own database row. */
export function ownRegistrationPayload(
  req: { eventId: string; eventTitle: string; eventDate: string },
  row: OwnRegistrationRow
): Record<string, unknown> | null {
  const status = (row.status ?? "").trim();
  if (!REGISTRATION_STATUSES.has(status)) return null;
  const email = (row.email ?? "").trim().toLowerCase();
  const name = (row.name ?? "").trim().slice(0, 200);
  if (!email && !name) return null;
  return {
    eventId: req.eventId,
    eventTitle: req.eventTitle,
    eventDate: req.eventDate,
    registrations: [{ id: String(row.id ?? "").slice(0, 100), name, email: email.slice(0, 254), phone: "", status, registeredAt: String(row.registered_at ?? "").slice(0, 40) }],
  };
}
