import { describe, it, expect } from "vitest";
import { earliestAllowedSend, frequencyBlock, sourcePolicyBlock, topicAllowed } from "./policy";
import { zonedToUtc } from "./time";

const LA = "America/Los_Angeles";

describe("member frequency: one per calendar month AND 30 full days", () => {
  it("blocks a second invitation in the same month even after 30 days is impossible", () => {
    const first = zonedToUtc(2027, 3, 1, 10, 0, LA);
    expect(frequencyBlock([first], zonedToUtc(2027, 3, 31, 10, 0, LA), LA)).toBe("month_cap");
  });

  it("blocks the next month until 30 full days have passed", () => {
    const first = zonedToUtc(2027, 3, 20, 10, 0, LA);
    expect(frequencyBlock([first], zonedToUtc(2027, 4, 2, 10, 0, LA), LA)).toBe("cooldown_30_days");
    expect(frequencyBlock([first], zonedToUtc(2027, 4, 19, 9, 59, LA), LA)).toBe("cooldown_30_days");
    expect(frequencyBlock([first], zonedToUtc(2027, 4, 19, 10, 0, LA), LA)).toBeNull();
  });

  it("counts 30 days as elapsed time across a DST change", () => {
    const first = zonedToUtc(2027, 2, 20, 12, 0, LA); // PST
    const exactly30 = new Date(first.getTime() + 30 * 86400000); // lands at 13:00 PDT locally
    expect(frequencyBlock([first], new Date(exactly30.getTime() - 1), LA)).toBe("cooldown_30_days");
    expect(frequencyBlock([first], exactly30, LA)).toBeNull();
  });

  it("uses the feature-timezone month, not UTC, at month boundaries", () => {
    // Jan 31 21:00 LA = Feb 1 05:00 UTC.
    const jan31Evening = zonedToUtc(2027, 1, 31, 21, 0, LA);
    // A send on Feb 1 LA is a different LA month -- only the 30-day rule blocks it.
    expect(frequencyBlock([jan31Evening], zonedToUtc(2027, 2, 1, 10, 0, LA), LA)).toBe("cooldown_30_days");
    // Whereas earlier on Jan 31 LA is the same month.
    expect(frequencyBlock([zonedToUtc(2027, 1, 2, 9, 0, LA)], jan31Evening, LA)).toBe("month_cap");
  });

  it("earliest next send is the later of +30 days and the next month", () => {
    const early = zonedToUtc(2027, 3, 1, 10, 0, LA);
    expect(earliestAllowedSend([early], LA)!.getTime()).toBe(zonedToUtc(2027, 4, 1, 0, 0, LA).getTime());
    const late = zonedToUtc(2027, 3, 25, 10, 0, LA);
    expect(earliestAllowedSend([late], LA)!.getTime()).toBe(late.getTime() + 30 * 86400000);
    expect(earliestAllowedSend([], LA)).toBeNull();
  });
});

describe("source policy across the bootstrap boundary", () => {
  const bootstrapEndsAt = zonedToUtc(2027, 2, 28, 10, 0, LA);
  const before = new Date(bootstrapEndsAt.getTime() - 1);
  const after = bootstrapEndsAt;
  const seedActivatedDuring = { source: "seed" as const, firstActivatedAt: zonedToUtc(2027, 1, 5, 9, 0, LA) };
  const seedNever = { source: "seed" as const, firstActivatedAt: null };
  const member = { source: "member" as const, firstActivatedAt: null };

  it("allows any approved seed during bootstrap", () => {
    expect(sourcePolicyBlock(seedNever, before, { bootstrapEndsAt, postBootstrapMode: "recycle_and_member" })).toBeNull();
  });

  it("recycle_and_member: recycles only seeds activated during bootstrap", () => {
    const s = { bootstrapEndsAt, postBootstrapMode: "recycle_and_member" as const };
    expect(sourcePolicyBlock(seedActivatedDuring, after, s)).toBeNull();
    expect(sourcePolicyBlock(seedNever, after, s)).toBe("seed_not_activated_during_bootstrap");
    expect(
      sourcePolicyBlock({ source: "seed", firstActivatedAt: bootstrapEndsAt }, after, s)
    ).toBe("seed_not_activated_during_bootstrap");
    expect(sourcePolicyBlock(member, after, s)).toBeNull();
  });

  it("member_only: no seeds at all after bootstrap", () => {
    const s = { bootstrapEndsAt, postBootstrapMode: "member_only" as const };
    expect(sourcePolicyBlock(seedActivatedDuring, after, s)).toBe("seed_not_allowed_member_only");
    expect(sourcePolicyBlock(member, after, s)).toBeNull();
  });
});

describe("topic consent", () => {
  const topics = new Map([
    ["friendship", { slug: "friendship", label: "Friendship", sensitive: false }],
    ["dating", { slug: "dating", label: "Dating", sensitive: true }],
  ]);
  const prefs = (t: string[] | null) => ({ optedOut: false, paused: false, topics: t, timezone: null });

  it("defaults to general topics only", () => {
    expect(topicAllowed(prefs(null), "friendship", topics)).toBe(true);
    expect(topicAllowed(prefs(null), "dating", topics)).toBe(false);
  });

  it("sensitive topics require an explicit choice", () => {
    expect(topicAllowed(prefs(["dating"]), "dating", topics)).toBe(true);
    expect(topicAllowed(prefs(["dating"]), "friendship", topics)).toBe(false);
  });
});
