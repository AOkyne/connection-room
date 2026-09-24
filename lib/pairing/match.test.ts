import { describe, it, expect } from "vitest";
import { buildWeeklyPairs, compatibilityScore, pairKey, weekStartOf, cityOf, type PairingCandidate } from "./match";

function candidate(userId: string, overrides: Partial<PairingCandidate> = {}): PairingCandidate {
  return { userId, interests: [], city: "", spaces: [], satOutLastWeek: false, ...overrides };
}

// Deterministic "random": a constant just under 1 makes Fisher-Yates pick
// j = i every step (order left intact), and adds the SAME jitter to every
// score, so comparisons between candidates are unaffected by it.
const noRandom = () => 0.999999;

describe("pairKey", () => {
  it("is order-independent", () => {
    expect(pairKey("a", "b")).toBe(pairKey("b", "a"));
  });
});

describe("cityOf", () => {
  it("takes the part before the first comma, trimmed and lowercased", () => {
    expect(cityOf("Los Angeles, CA")).toBe("los angeles");
    expect(cityOf(" Los Angeles ")).toBe("los angeles");
    expect(cityOf(null)).toBe("");
  });
});

describe("compatibilityScore", () => {
  it("rewards shared interests, same city, and shared spaces", () => {
    const a = candidate("a", { interests: ["Spirituality", "Touch"], city: "los angeles", spaces: ["s1"] });
    const b = candidate("b", { interests: ["spirituality"], city: "los angeles", spaces: ["s1"] });
    expect(compatibilityScore(a, b)).toBe(3 + 2 + 1);
  });

  it("does not treat two empty cities as the same city", () => {
    expect(compatibilityScore(candidate("a"), candidate("b"))).toBe(0);
  });
});

describe("buildWeeklyPairs", () => {
  it("pairs everyone when the count is even", () => {
    const { pairs, unpaired } = buildWeeklyPairs(
      [candidate("a"), candidate("b"), candidate("c"), candidate("d")],
      new Set(),
      noRandom
    );
    expect(pairs).toHaveLength(2);
    expect(unpaired).toHaveLength(0);
    const everyone = pairs.flat();
    expect(new Set(everyone).size).toBe(4);
  });

  it("leaves exactly one person unpaired when the count is odd", () => {
    const { pairs, unpaired } = buildWeeklyPairs([candidate("a"), candidate("b"), candidate("c")], new Set(), noRandom);
    expect(pairs).toHaveLength(1);
    expect(unpaired).toHaveLength(1);
  });

  it("never pairs an excluded pair (already connected or blocked)", () => {
    const { pairs, unpaired } = buildWeeklyPairs([candidate("a"), candidate("b")], new Set([pairKey("a", "b")]), noRandom);
    expect(pairs).toHaveLength(0);
    expect(unpaired.sort()).toEqual(["a", "b"]);
  });

  it("prefers the more compatible partner when there's no random jitter", () => {
    const a = candidate("a", { interests: ["spirituality"], city: "los angeles" });
    const b = candidate("b");
    const c = candidate("c", { interests: ["spirituality"], city: "los angeles" });
    const { pairs } = buildWeeklyPairs([a, b, c], new Set(), noRandom);
    expect(pairs).toContainEqual(["a", "c"]);
  });

  it("puts members who sat out last week first in line", () => {
    const a = candidate("a");
    const b = candidate("b");
    const c = candidate("c", { satOutLastWeek: true });
    const { unpaired } = buildWeeklyPairs([a, b, c], new Set(), noRandom);
    expect(unpaired).not.toContain("c");
  });
});

describe("weekStartOf", () => {
  it("returns the Monday of the week, in UTC", () => {
    expect(weekStartOf(new Date("2026-09-24T12:00:00Z"))).toBe("2026-09-21"); // Thursday -> Monday
    expect(weekStartOf(new Date("2026-09-21T00:00:00Z"))).toBe("2026-09-21"); // Monday -> itself
    expect(weekStartOf(new Date("2026-09-27T23:59:00Z"))).toBe("2026-09-21"); // Sunday -> prior Monday
  });
});
