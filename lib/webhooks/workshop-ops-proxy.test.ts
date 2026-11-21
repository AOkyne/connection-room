import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// The route calls requireUser(); each test decides who the caller is.
const requireUser = vi.fn();
vi.mock("@/lib/auth/require-user", () => ({ requireUser: (...a: unknown[]) => requireUser(...a) }));

import { POST } from "../../app/api/webhooks/workshop-ops/route";
import { cleanPayload, registrationsAllowed } from "./workshop-ops-guard";

function caller(role: "admin" | "member", email = "member@example.com") {
  return {
    ok: true as const,
    userId: "u1",
    supabase: {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role } }) }) }) }),
      auth: { admin: { getUserById: async () => ({ data: { user: { email } } }) } },
    },
  };
}

function call(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/webhooks/workshop-ops", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer t" },
      body: JSON.stringify(body),
    })
  );
}

const fetchMock = vi.fn();

beforeEach(() => {
  requireUser.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  process.env.WORKSHOP_API_KEY = "secret-key";
});

const reg = (email: string) => ({ id: "r1", name: "A B", email, status: "registered", registeredAt: "2026-11-21T10:00:00Z" });

describe("workshop-ops proxy: who may call it", () => {
  it("rejects callers who are not signed in, and never contacts Workshop Ops", async () => {
    requireUser.mockResolvedValue({ ok: false, status: 401, error: "Missing authorization token" });
    const res = await call({ action: "delete", payload: { eventId: "e1" } });
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unknown actions", async () => {
    requireUser.mockResolvedValue(caller("admin"));
    expect((await call({ action: "drop-everything", payload: {} })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets a member NOT create, update or delete workshops", async () => {
    for (const action of ["create", "update", "delete"]) {
      requireUser.mockResolvedValue(caller("member"));
      const res = await call({ action, payload: { eventId: "e1", eventTitle: "T", eventDate: "2026-12-01" } });
      expect(res.status).toBe(403);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets an admin delete a workshop, sending only the key and event id", async () => {
    requireUser.mockResolvedValue(caller("admin"));
    const res = await call({ action: "delete", payload: { eventId: "e1", extra: "ignored" } });
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://workshops.trevorjamesla.com/api/workshops-delete");
    expect(init.headers.Authorization).toBe("Bearer secret-key");
    expect(JSON.parse(init.body)).toEqual({ eventId: "e1" });
  });

  it("lets a member send their own registration only", async () => {
    requireUser.mockResolvedValue(caller("member", "member@example.com"));
    const mine = await call({ action: "registrations", payload: { eventId: "e1", eventTitle: "T", eventDate: "2026-12-01", registrations: [reg("Member@Example.com")] } });
    expect(mine.status).toBe(200);

    requireUser.mockResolvedValue(caller("member", "member@example.com"));
    const theirs = await call({ action: "registrations", payload: { eventId: "e1", registrations: [reg("someone.else@example.com")] } });
    expect(theirs.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("lets an admin send registrations for anyone (e.g. mark attended)", async () => {
    requireUser.mockResolvedValue(caller("admin"));
    const res = await call({ action: "registrations", payload: { eventId: "e1", registrations: [reg("someone.else@example.com")] } });
    expect(res.status).toBe(200);
  });

  it("rejects bad payloads", async () => {
    requireUser.mockResolvedValue(caller("admin"));
    expect((await call({ action: "create", payload: { eventTitle: "T" } })).status).toBe(400);
    expect((await call({ action: "registrations", payload: { registrations: [{ name: "x", email: "not-an-email", status: "registered" }] } })).status).toBe(400);
    expect((await call({ action: "registrations", payload: { registrations: Array.from({ length: 201 }, () => reg("a@b.co")) } })).status).toBe(400);
  });
});

describe("workshop-ops guard helpers", () => {
  it("trims unknown fields and long text", () => {
    const r = cleanPayload("update", { eventId: "e1", eventTitle: "x".repeat(500), hack: "drop table" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.payload).sort()).toEqual(["eventId", "eventTitle"]);
      expect(String(r.payload.eventTitle).length).toBe(200);
    }
  });

  it("registrationsAllowed: members need a matching email on every entry", () => {
    expect(registrationsAllowed(false, "a@b.co", { registrations: [{ email: "a@b.co" }, { email: "c@d.co" }] })).toBe(false);
    expect(registrationsAllowed(false, null, { registrations: [{ email: "a@b.co" }] })).toBe(false);
    expect(registrationsAllowed(true, null, { registrations: [{ email: "x@y.co" }] })).toBe(true);
  });
});
