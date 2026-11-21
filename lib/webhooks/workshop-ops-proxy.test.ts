import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// The route calls requireUser(); each test decides who the caller is.
const requireUser = vi.fn();
vi.mock("@/lib/auth/require-user", () => ({ requireUser: (...a: unknown[]) => requireUser(...a) }));

import { POST } from "../../app/api/webhooks/workshop-ops/route";
import { cleanPayload } from "./workshop-ops-guard";

function caller(role: "admin" | "member", ownRow: Record<string, unknown> | null = null) {
  const supabase = {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: table === "profiles" ? { role } : table === "event_registrations" ? ownRow : null }),
      };
      return chain;
    },
  };
  return { ok: true as const, userId: "u1", supabase };
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

  const ownRow = { id: "r-own", name: "Member One", email: "Member@Example.com", status: "registered", registered_at: "2026-11-21T10:00:00Z" };

  it("when a member registers, only THEIR registration (from the database) goes to Workshop Ops, not the browser's list", async () => {
    requireUser.mockResolvedValue(caller("member", ownRow));
    const browserList = [reg("member@example.com"), reg("other.person@example.com"), reg("forged@evil.example")];
    const res = await call({ action: "registrations", payload: { eventId: "e1", eventTitle: "T", eventDate: "2026-12-01", registrations: browserList } });
    expect(res.status).toBe(200);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.registrations).toEqual([{ id: "r-own", name: "Member One", email: "member@example.com", phone: "", status: "registered", registeredAt: "2026-11-21T10:00:00Z" }]);
    expect(sent.eventId).toBe("e1");
    expect(JSON.stringify(sent)).not.toContain("forged");
  });

  it("a member's cancellation goes through even when the browser's list is empty", async () => {
    requireUser.mockResolvedValue(caller("member", { ...ownRow, status: "cancelled" }));
    const res = await call({ action: "registrations", payload: { eventId: "e1", eventTitle: "T", eventDate: "2026-12-01", registrations: [] } });
    expect(res.status).toBe(200);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).registrations[0].status).toBe("cancelled");
  });

  it("a member with no registration for that event is refused", async () => {
    requireUser.mockResolvedValue(caller("member", null));
    const res = await call({ action: "registrations", payload: { eventId: "e1", registrations: [reg("someone@example.com")] } });
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a member cannot name a different email: the email always comes from their own row", async () => {
    requireUser.mockResolvedValue(caller("member", ownRow));
    await call({ action: "registrations", payload: { eventId: "e1", registrations: [reg("someone.else@example.com")] } });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).registrations[0].email).toBe("member@example.com");
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


});
