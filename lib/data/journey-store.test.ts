import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ supabase: null }));

import { mergeJourney } from "./journey-store";

describe("mergeJourney (rescuing reflections kept in a browser)", () => {
  it("uses the browser copy when the account has nothing yet", () => {
    const local = { privateReflections: { 1: "arriving" }, completedDoors: [1] };
    const { merged, changed } = mergeJourney("first_week", null, local);
    expect(merged).toEqual(local);
    expect(changed).toBe(true);
  });

  it("keeps the account's text and adds only what the account is missing", () => {
    const remote = { privateReflections: { "1": "account text" }, completedDoors: [1], currentDoor: 2 };
    const local = { privateReflections: { "1": "older browser text", "3": "only in browser" }, completedDoors: [1, 2, 3], currentDoor: 4 };
    const { merged, changed } = mergeJourney("first_week", remote, local);
    expect(merged.privateReflections).toEqual({ "1": "account text", "3": "only in browser" });
    expect(merged.completedDoors).toEqual([1, 2, 3]);
    expect(merged.currentDoor).toBe(4);
    expect(changed).toBe(true);
  });

  it("reports no change when the browser adds nothing new", () => {
    const remote = { privateReflections: { "1": "same" }, completedDoors: [1] };
    const local = { privateReflections: { "1": "same", "2": "   " }, completedDoors: [1] };
    expect(mergeJourney("first_week", remote, local).changed).toBe(false);
  });

  it("rescues weekly reflections, intentions and month look-backs", () => {
    const remote = { privateReflections: { m1w1: "kept" }, monthlyIntentions: {}, monthlyIntegrations: {} };
    const local = { privateReflections: { m1w1: "old", m1w2: "new" }, monthlyIntentions: { "1": "slow down" }, monthlyIntegrations: { "1": "looking back" } };
    const { merged, changed } = mergeJourney("guided_rhythm", remote, local);
    expect(merged.privateReflections).toEqual({ m1w1: "kept", m1w2: "new" });
    expect(merged.monthlyIntentions).toEqual({ "1": "slow down" });
    expect(merged.monthlyIntegrations).toEqual({ "1": "looking back" });
    expect(changed).toBe(true);
  });
});
