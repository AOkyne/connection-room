import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { exportSPKI, generateKeyPair, SignJWT, type CryptoKey } from "jose";
import { NextRequest } from "next/server";
import { destinationFor, loadPassKey, MAX_PASS_LIFETIME_S, parseRooms, redeemPass, sha256Hex, verifyPass, type Room } from "./pass";
import { createSessionValue, opensLentoRoom, readSessionValue, ROOM_COOKIE, ROOM_SESSION_SECONDS } from "./session";
import { dueSlots, DEFAULT_SCHEDULE, pickPrompt, type PromptCandidate } from "./schedule";
import { PROMPT_CATEGORIES, SEED_PROMPTS } from "./prompt-seed";

// ------------------------------------------------------------ fakes

// Just enough of supabase-js for the entry route and resolveRoomActor:
// chainable queries, a primary-key insert on lento_pass_redemptions, and a
// members table keyed by sub_hash.
const db = {
  redemptions: new Set<string>(),
  members: new Map<string, Record<string, unknown>>(),
  events: [] as string[],
};

class Query {
  private filters: Record<string, unknown> = {};
  private op: "select" | "insert" | "upsert" | "delete" | "update" = "select";
  private row: Record<string, unknown> = {};
  constructor(private table: string) {}
  select() {
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters[col] = val;
    return this;
  }
  lt() {
    return this;
  }
  insert(row: Record<string, unknown>) {
    this.op = "insert";
    this.row = row;
    return this;
  }
  upsert(row: Record<string, unknown>) {
    this.op = "upsert";
    this.row = row;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  update(row: Record<string, unknown>) {
    this.op = "update";
    this.row = row;
    return this;
  }
  private run(): { data: unknown; error: unknown } {
    if (this.table === "lento_pass_redemptions" && this.op === "insert") {
      const key = String(this.row.jti_hash);
      if (db.redemptions.has(key)) return { data: null, error: { code: "23505" } };
      db.redemptions.add(key);
      return { data: null, error: null };
    }
    if (this.table === "lento_room_entry_events" && this.op === "insert") {
      db.events.push(String(this.row.outcome));
      return { data: null, error: null };
    }
    if (this.table === "lento_room_members") {
      const hash = String(this.filters.sub_hash ?? this.row.sub_hash);
      if (this.op === "upsert") {
        const existing = db.members.get(hash) || {
          id: `m-${db.members.size + 1}`,
          sub_hash: hash,
          display_name: null,
          is_host: false,
          welcomed_at: null,
          restricted_at: null,
        };
        db.members.set(hash, { ...existing, ...this.row });
        return { data: db.members.get(hash), error: null };
      }
      return { data: db.members.get(hash) || null, error: null };
    }
    return { data: null, error: null };
  }
  maybeSingle() {
    return Promise.resolve(this.run());
  }
  single() {
    return Promise.resolve(this.run());
  }
  then<T>(resolve: (v: { data: unknown; error: unknown }) => T) {
    return Promise.resolve(this.run()).then(resolve);
  }
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (t: string) => new Query(t) }),
}));

const adminState = { isAdmin: false };
vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: async () =>
    adminState.isAdmin
      ? { ok: true, userId: "admin-user", supabase: { from: (t: string) => new Query(t) } }
      : { ok: false, status: 403, error: "Admin access required" },
}));

// ------------------------------------------------------------ keys and passes

let privateKey: CryptoKey;
let publicPem: string;
let otherPrivateKey: CryptoKey;
const SECRET = "test-session-secret-0123456789-abcdefghijklmnop";
const NOW = Date.UTC(2026, 10, 4, 18, 0, 0);
const nowS = Math.floor(NOW / 1000);

beforeAll(async () => {
  const kp = await generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
  privateKey = kp.privateKey;
  publicPem = await exportSPKI(kp.publicKey);
  otherPrivateKey = (await generateKeyPair("EdDSA", { crv: "Ed25519" })).privateKey;
});

beforeEach(() => {
  db.redemptions.clear();
  db.members.clear();
  db.events = [];
  adminState.isAdmin = false;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  process.env.LENTO_ROOM_SESSION_SECRET = SECRET;
  process.env.LENTO_PASS_PUBLIC_KEY = publicPem;
});

let jtiCounter = 0;
async function pass(
  overrides: Record<string, unknown> = {},
  opts: { key?: CryptoKey; iat?: number; exp?: number; iss?: string; aud?: string | string[] } = {}
) {
  const iat = opts.iat ?? nowS;
  const claims = { rooms: ["lento"], jti: `jti-${++jtiCounter}-abcdef`, ...overrides };
  let jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: "EdDSA" })
    .setIssuer(opts.iss ?? "lento")
    .setAudience(opts.aud ?? "connection-room")
    .setIssuedAt(iat)
    .setExpirationTime(opts.exp ?? iat + 120);
  if (!("sub" in overrides)) jwt = jwt.setSubject("sub-0123456789abcdef");
  return jwt.sign(opts.key ?? privateKey);
}

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

describe("signed entry pass", () => {
  it.each([
    [["lento"], ["lento"]],
    [["connection"], ["connection"]],
    [["connection", "lento"], ["connection", "lento"]],
    [["lento", "connection", "lento"], ["connection", "lento"]],
    [["lento", "vip", "admin"], ["lento"]],
  ])("accepts rooms %j as %j (unknown values ignored)", async (rooms, expected) => {
    const key = await loadPassKey(publicPem);
    const v = await verifyPass(await pass({ rooms }), key, NOW);
    expect(v.ok && v.claims.rooms).toEqual(expected);
  });

  it.each([[[]], [["vip"]], ["lento"], [[1, "lento"]], [{ lento: true }], [null]])("refuses rooms %j", async (rooms) => {
    const key = await loadPassKey(publicPem);
    expect((await verifyPass(await pass({ rooms }), key, NOW)).ok).toBe(false);
  });

  it("refuses a pass with no rooms claim, or the old lvl claim instead", async () => {
    const key = await loadPassKey(publicPem);
    expect((await verifyPass(await pass({ rooms: undefined }), key, NOW)).ok).toBe(false);
    expect((await verifyPass(await pass({ rooms: undefined, lvl: "graduate" }), key, NOW)).ok).toBe(false);
  });

  it("refuses a pass whose rooms claim was tampered with", async () => {
    const key = await loadPassKey(publicPem);
    const token = await pass({ rooms: ["connection"] });
    const [h, body, sig] = token.split(".");
    const claims = JSON.parse(Buffer.from(body, "base64url").toString());
    const tampered = `${h}.${b64({ ...claims, rooms: ["connection", "lento"] })}.${sig}`;
    expect((await verifyPass(token, key, NOW)).ok).toBe(true);
    expect((await verifyPass(tampered, key, NOW)).ok).toBe(false);
  });

  it("loads the key when Vercel stores it with literal \\n", async () => {
    expect(await loadPassKey(publicPem.replace(/\n/g, "\\n"))).toBeTruthy();
    expect(await loadPassKey("not a key")).toBeNull();
    expect(await loadPassKey(undefined)).toBeNull();
  });

  it("refuses an expired pass, beyond the 30-second tolerance", async () => {
    const key = await loadPassKey(publicPem);
    const token = await pass({}, { iat: nowS - 200, exp: nowS - 80 });
    expect(await verifyPass(token, key, NOW)).toEqual({ ok: false, reason: "expired" });
    const justExpired = await pass({}, { iat: nowS - 130, exp: nowS - 10 });
    expect((await verifyPass(justExpired, key, NOW)).ok).toBe(true);
  });

  it("refuses the wrong audience or issuer", async () => {
    const key = await loadPassKey(publicPem);
    expect((await verifyPass(await pass({}, { aud: "someone-else" }), key, NOW)).ok).toBe(false);
    expect((await verifyPass(await pass({}, { aud: ["connection-room", "other"] }), key, NOW)).ok).toBe(false);
    expect((await verifyPass(await pass({}, { iss: "not-lento" }), key, NOW)).ok).toBe(false);
  });

  it("refuses a tampered pass and one signed by another key", async () => {
    const key = await loadPassKey(publicPem);
    const [h, , s] = (await pass({ rooms: ["connection"] })).split(".");
    const forged = `${h}.${b64({ sub: "sub-0123456789abcdef", rooms: ["lento"], iss: "lento", aud: "connection-room", iat: nowS, exp: nowS + 120, jti: "jti-forged-123" })}.${s}`;
    expect((await verifyPass(forged, key, NOW)).ok).toBe(false);
    expect((await verifyPass(await pass({}, { key: otherPrivateKey }), key, NOW)).ok).toBe(false);
  });

  it("refuses alg none and HS256", async () => {
    const key = await loadPassKey(publicPem);
    const body = b64({ sub: "sub-0123456789abcdef", rooms: ["lento"], iss: "lento", aud: "connection-room", iat: nowS, exp: nowS + 120, jti: "jti-none-12345" });
    expect((await verifyPass(`${b64({ alg: "none", typ: "JWT" })}.${body}.`, key, NOW)).ok).toBe(false);
    const hs = await new SignJWT({ rooms: ["lento"], jti: "jti-hs256-1234" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("sub-0123456789abcdef")
      .setIssuer("lento")
      .setAudience("connection-room")
      .setIssuedAt(nowS)
      .setExpirationTime(nowS + 120)
      .sign(new TextEncoder().encode(publicPem));
    expect((await verifyPass(hs, key, NOW)).ok).toBe(false);
  });

  it("refuses a missing, empty or malformed pass", async () => {
    const key = await loadPassKey(publicPem);
    expect(await verifyPass(null, key, NOW)).toEqual({ ok: false, reason: "missing" });
    expect(await verifyPass("", key, NOW)).toEqual({ ok: false, reason: "missing" });
    expect((await verifyPass("abc.def", key, NOW)).ok).toBe(false);
  });

  it("refuses missing or wrongly typed claims", async () => {
    const key = await loadPassKey(publicPem);
    expect((await verifyPass(await pass({ jti: 42 }), key, NOW)).ok).toBe(false);
    expect((await verifyPass(await pass({ jti: undefined }), key, NOW)).ok).toBe(false);
    expect((await verifyPass(await pass({ sub: undefined }), key, NOW)).ok).toBe(false);
    expect((await verifyPass(await pass({ sub: "x" }), key, NOW)).ok).toBe(false);
  });

  it("refuses a pass with an invalid lifetime or issued in the future", async () => {
    const key = await loadPassKey(publicPem);
    expect((await verifyPass(await pass({}, { exp: nowS + MAX_PASS_LIFETIME_S + 60 }), key, NOW)).ok).toBe(false);
    expect((await verifyPass(await pass({}, { iat: nowS + 300, exp: nowS + 400 }), key, NOW)).ok).toBe(false);
    expect((await verifyPass(await pass({}, { exp: nowS }), key, NOW)).ok).toBe(false);
  });

  it("refuses everything when the key isn't configured", async () => {
    expect(await verifyPass(await pass(), null, NOW)).toEqual({ ok: false, reason: "misconfigured" });
  });
});

describe("one-time use", () => {
  const memoryStore = () => {
    const used = new Set<string>();
    return async (hash: string, _expiresAt?: Date) => {
      void _expiresAt;
      if (used.has(hash)) return false;
      used.add(hash);
      return true;
    };
  };

  it("refuses a reused pass and stores only a hash of its id", async () => {
    const key = await loadPassKey(publicPem);
    const seen: string[] = [];
    const store = memoryStore();
    const spy = async (h: string, d: Date) => {
      seen.push(h);
      return store(h, d);
    };
    const token = await pass({ jti: "jti-once-only-1" });
    expect((await redeemPass(token, key, spy, NOW)).ok).toBe(true);
    expect(await redeemPass(token, key, spy, NOW)).toEqual({ ok: false, reason: "replayed" });
    expect(seen[0]).toBe(sha256Hex("jti-once-only-1"));
    expect(seen[0]).not.toContain("jti-once");
  });

  it("lets only one of several concurrent redemptions succeed", async () => {
    const key = await loadPassKey(publicPem);
    const store = memoryStore();
    const token = await pass();
    const results = await Promise.all(Array.from({ length: 5 }, () => redeemPass(token, key, store, NOW)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });
});

describe("room session cookie", () => {
  it("round-trips sub, rooms and a 24-hour expiry", () => {
    const { value, exp } = createSessionValue("sub-1", ["lento"], SECRET, NOW);
    expect(exp - nowS).toBe(ROOM_SESSION_SECONDS);
    expect(readSessionValue(value, SECRET, NOW)).toEqual({ sub: "sub-1", rooms: ["lento"], exp });
  });

  it("stops working after 24 hours, with no renewal", () => {
    const { value } = createSessionValue("sub-1", ["connection", "lento"], SECRET, NOW);
    expect(readSessionValue(value, SECRET, NOW + ROOM_SESSION_SECONDS * 1000 - 1000)).not.toBeNull();
    expect(readSessionValue(value, SECRET, NOW + ROOM_SESSION_SECONDS * 1000 + 1000)).toBeNull();
  });

  it("refuses a tampered cookie or one signed with another secret", () => {
    const { value } = createSessionValue("sub-1", ["connection"], SECRET, NOW);
    const [, sig] = value.split(".");
    const forged = `${b64({ sub: "sub-1", rooms: ["connection", "lento"], exp: nowS + 1000 })}.${sig}`;
    expect(readSessionValue(forged, SECRET, NOW)).toBeNull();
    expect(readSessionValue(value, `${SECRET}-other`, NOW)).toBeNull();
    expect(readSessionValue("garbage", SECRET, NOW)).toBeNull();
    expect(readSessionValue(value, null, NOW)).toBeNull();
  });

  it("only a session whose rooms include lento opens the Lento Room", () => {
    const s = (rooms: Room[]) => ({ sub: "s", rooms, exp: nowS + 10 });
    expect(opensLentoRoom(s(["lento"]))).toBe(true);
    expect(opensLentoRoom(s(["connection", "lento"]))).toBe(true);
    expect(opensLentoRoom(s(["connection"]))).toBe(false);
    expect(opensLentoRoom(null)).toBe(false);
    expect(parseRooms(["connection", "elsewhere"])).toEqual(["connection"]);
  });
});

describe("/enter", () => {
  async function enter(query: string) {
    const { GET } = await import("@/app/enter/route");
    return GET(new NextRequest(`https://community.trevorjamesla.com/enter${query}`));
  }

  it.each([
    [["lento"], "/lento-room", "ok_lento"],
    [["connection", "lento"], "/lento-room", "ok_connection_lento"],
    [["connection"], "/app", "ok_connection"],
  ])("rooms %j: sets the session and goes to %s", async (rooms, path, outcome) => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    const res = await enter(`?pass=${await pass({ rooms })}`);
    vi.useRealTimers();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`https://community.trevorjamesla.com${path}`);
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    const cookie = res.headers.get("set-cookie") || "";
    expect(cookie).toContain(`${ROOM_COOKIE}=`);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("secure");
    expect(cookie.toLowerCase()).toContain("samesite=lax");
    expect(cookie).toContain("Path=/");
    expect(db.events).toEqual([outcome]);
  });

  it.each([
    [["lento"], "lento", "/lento-room"],
    [["lento"], "connection", "/lento-room"],
    [["connection"], "connection", "/app"],
    [["connection"], "lento", "/app"],
    [["connection", "lento"], "lento", "/lento-room"],
    [["connection", "lento"], "connection", "/app"],
    [["connection", "lento"], "elsewhere", "/lento-room"],
    [["connection", "lento"], null, "/lento-room"],
  ] as const)("rooms %j with &room=%s goes to %s", async (rooms, room, path) => {
    expect(destinationFor([...rooms], room)).toBe(path);
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    const res = await enter(`?pass=${await pass({ rooms })}${room ? `&room=${room}` : ""}`);
    vi.useRealTimers();
    expect(res.headers.get("location")).toBe(`https://community.trevorjamesla.com${path}`);
  });

  it("asking for the Lento Room with a connection-only pass doesn't open it", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    const res = await enter(`?pass=${await pass({ rooms: ["connection"] })}&room=lento`);
    vi.useRealTimers();
    const cookie = (res.headers.get("set-cookie") || "").split(";")[0].split("=").slice(1).join("=");
    expect(opensLentoRoom(readSessionValue(cookie, SECRET))).toBe(false);
  });

  it("a reused pass goes to the friendly expired page", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    const token = await pass();
    await enter(`?pass=${token}`);
    const second = await enter(`?pass=${token}`);
    vi.useRealTimers();
    expect(second.headers.get("location")).toBe("https://community.trevorjamesla.com/lento-room/expired");
    expect(second.headers.get("set-cookie")).toBeNull();
  });

  it.each([["", "missing"], ["?pass=", "missing"], ["?pass=not.a.jwt", "invalid"]])(
    "%s is refused the same way",
    async (query, outcome) => {
      const res = await enter(query);
      expect(res.headers.get("location")).toBe("https://community.trevorjamesla.com/lento-room/expired");
      expect(res.headers.get("set-cookie")).toBeNull();
      expect(db.events).toEqual([outcome]);
    }
  );

  it("the redirect never carries the pass or the member id", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    const res = await enter(`?pass=${await pass()}`);
    vi.useRealTimers();
    expect(res.headers.get("location")).not.toMatch(/pass|sub-0123/);
  });
});

describe("room authorization (every /api/lento-room route goes through this)", () => {
  async function actorFor(headers: Record<string, string>) {
    const { resolveRoomActor } = await import("./room");
    return resolveRoomActor(new NextRequest("https://community.trevorjamesla.com/api/lento-room/messages", { headers }));
  }
  const cookieFor = (rooms: Room[], now = Date.now()) =>
    `${ROOM_COOKIE}=${createSessionValue("sub-0123456789abcdef", rooms, SECRET, now).value}`;

  it.each([[["lento"]], [["connection", "lento"]]] as Room[][][])("a session with rooms %j is let in, as a pseudonymous member", async (rooms) => {
    const actor = await actorFor({ cookie: cookieFor(rooms) });
    expect(actor.ok).toBe(true);
    if (actor.ok) {
      expect(actor.via).toBe("lento");
      expect(actor.member.sub_hash).toBe(sha256Hex("sub-0123456789abcdef"));
    }
  });

  it("the same person keeps one identity across passes", async () => {
    await actorFor({ cookie: cookieFor(["lento"]) });
    await actorFor({ cookie: cookieFor(["connection", "lento"]) });
    expect(db.members.size).toBe(1);
  });

  it("a session with only connection never opens the Lento Room", async () => {
    expect(await actorFor({ cookie: cookieFor(["connection"]) })).toMatchObject({ ok: false, status: 401 });
  });

  it("a session cookie with tampered rooms is refused", async () => {
    const value = createSessionValue("sub-0123456789abcdef", ["connection"], SECRET).value;
    const [payload, sig] = value.split(".");
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    const forged = `${b64({ ...data, rooms: ["connection", "lento"] })}.${sig}`;
    expect(await actorFor({ cookie: `${ROOM_COOKIE}=${forged}` })).toMatchObject({ ok: false, status: 401 });
  });

  it("no session is refused", async () => {
    expect(await actorFor({})).toMatchObject({ ok: false, status: 401 });
  });

  it("a normal Connection Room login without a Lento session is refused", async () => {
    adminState.isAdmin = false;
    expect(await actorFor({ authorization: "Bearer member-token" })).toMatchObject({ ok: false, status: 401 });
  });

  it("an expired 24-hour session is refused", async () => {
    const old = Date.now() - (ROOM_SESSION_SECONDS + 60) * 1000;
    expect(await actorFor({ cookie: cookieFor(["lento"], old) })).toMatchObject({ ok: false, status: 401 });
  });

  it("the host (a Connection Room admin) can come in", async () => {
    adminState.isAdmin = true;
    const actor = await actorFor({ authorization: "Bearer admin-token" });
    expect(actor.ok && actor.via).toBe("host");
  });

  it("a member removed by moderation is refused", async () => {
    db.members.set(sha256Hex("sub-0123456789abcdef"), {
      id: "m-x",
      sub_hash: sha256Hex("sub-0123456789abcdef"),
      restricted_at: "2026-11-01T00:00:00Z",
    });
    expect(await actorFor({ cookie: cookieFor(["lento"]) })).toMatchObject({ ok: false, status: 403 });
  });
});

describe("prompt rhythm", () => {
  it("is due on its day after its hour, in Los Angeles time", () => {
    // Monday 2026-11-02 09:30 PST = 17:30 UTC
    expect(dueSlots(new Date("2026-11-02T17:30:00Z"), DEFAULT_SCHEDULE, "America/Los_Angeles")).toEqual([
      { slot: "weekly", scheduledFor: "2026-11-02" },
    ]);
    // Monday 08:30 local: not yet
    expect(dueSlots(new Date("2026-11-02T16:30:00Z"), DEFAULT_SCHEDULE, "America/Los_Angeles")).toEqual([]);
    // Tuesday: nothing
    expect(dueSlots(new Date("2026-11-03T20:00:00Z"), DEFAULT_SCHEDULE, "America/Los_Angeles")).toEqual([]);
    // Friday evening local (Saturday UTC) is still Friday's slot
    expect(dueSlots(new Date("2026-11-07T05:00:00Z"), DEFAULT_SCHEDULE, "America/Los_Angeles")).toEqual([
      { slot: "learning", scheduledFor: "2026-11-06" },
    ]);
  });

  it("balances categories and avoids repeats", () => {
    const prompts: PromptCandidate[] = [
      { id: "a", slot: "weekly", category: "overthinking", enabled: true, timesPublished: 0, lastPublishedAt: null },
      { id: "b", slot: "weekly", category: "overthinking", enabled: true, timesPublished: 0, lastPublishedAt: null },
      { id: "c", slot: "weekly", category: "body-awareness", enabled: true, timesPublished: 1, lastPublishedAt: "2026-10-01T00:00:00Z" },
      { id: "d", slot: "weekly", category: "humor-everyday", enabled: false, timesPublished: 0, lastPublishedAt: null },
      { id: "e", slot: "midweek", category: "humor-everyday", enabled: true, timesPublished: 0, lastPublishedAt: null },
    ];
    // overthinking was just used, so body-awareness wins despite being used before
    expect(pickPrompt(prompts, "weekly", ["overthinking"], "2026-11-02")?.id).toBe("c");
    // with no recent history, an unused prompt wins
    expect(["a", "b"]).toContain(pickPrompt(prompts, "weekly", [], "2026-11-02")?.id);
    // disabled prompts and other slots are never picked
    expect(pickPrompt(prompts.filter((p) => p.id === "d"), "weekly", [], "x")).toBeNull();
  });

  it("the seed bank has 60+ distinct prompts across all ten subjects and slots", () => {
    expect(SEED_PROMPTS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(SEED_PROMPTS.map((p) => p.seedId)).size).toBe(SEED_PROMPTS.length);
    expect(new Set(SEED_PROMPTS.map((p) => p.body.toLowerCase())).size).toBe(SEED_PROMPTS.length);
    expect(new Set(SEED_PROMPTS.map((p) => p.category))).toEqual(new Set(PROMPT_CATEGORIES));
    expect(new Set(SEED_PROMPTS.map((p) => p.slot))).toEqual(new Set(["weekly", "midweek", "learning"]));
    for (const p of SEED_PROMPTS) expect(p.body).not.toMatch(/erection|orgasm|wife|girlfriend|boyfriend|husband|season \d/i);
  });
});
