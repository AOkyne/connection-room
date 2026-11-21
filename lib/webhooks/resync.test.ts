import { describe, expect, it } from "vitest";
import { summarizeResync, toResyncBatches } from "./resync";

describe("resync helpers", () => {
  it("splits long lists into batches the proxy accepts", () => {
    const list = Array.from({ length: 250 }, (_, i) => i);
    const batches = toResyncBatches(list);
    expect(batches.map((b) => b.length)).toEqual([100, 100, 50]);
    expect(toResyncBatches([])).toEqual([]);
  });

  it("says plainly when nobody is registered", () => {
    const s = summarizeResync(0, []);
    expect(s.ok).toBe(true);
    expect(s.message).toMatch(/nothing to send/);
  });

  it("adds up the batches into one friendly message", () => {
    const s = summarizeResync(150, [
      { ok: true, status: 200, created: 3, updated: 97, errors: 0 },
      { ok: true, status: 200, created: 0, updated: 50, errors: 0 },
    ]);
    expect(s.ok).toBe(true);
    expect(s.message).toBe("Sent 150 registrations: 3 added, 147 already there.");
  });

  it("explains the common failures in plain words", () => {
    expect(summarizeResync(2, [{ ok: false, status: 404 }]).message).toMatch(/no workshop for this event/);
    expect(summarizeResync(2, [{ ok: false, status: 401 }]).message).toMatch(/real admin account/);
    expect(summarizeResync(2, [{ ok: false, status: 403 }]).message).toMatch(/real admin account/);
    expect(summarizeResync(2, [{ ok: false, status: 500, message: "boom" }]).message).toBe("boom");
  });

  it("flags registrations Workshop Ops could not save", () => {
    const s = summarizeResync(2, [{ ok: true, status: 200, created: 1, updated: 0, errors: 1 }]);
    expect(s.ok).toBe(false);
    expect(s.message).toMatch(/1 could not be saved/);
  });
});
