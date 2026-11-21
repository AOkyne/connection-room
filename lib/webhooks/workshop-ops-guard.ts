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

/** A non-admin may only send registrations whose email is their own account email. */
export function registrationsAllowed(isAdmin: boolean, callerEmail: string | null | undefined, payload: Record<string, unknown>): boolean {
  if (isAdmin) return true;
  const mine = (callerEmail ?? "").trim().toLowerCase();
  if (!mine) return false;
  const regs = Array.isArray(payload.registrations) ? (payload.registrations as Array<{ email?: string }>) : [];
  return regs.length > 0 && regs.every((r) => (r.email ?? "").toLowerCase() === mine);
}
