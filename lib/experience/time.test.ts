import { describe, it, expect } from "vitest";
import { addCalendarMonths, bootstrapEndFor, monthKey, startOfNextMonth, zonedParts, zonedToUtc } from "./time";

const LA = "America/Los_Angeles";

describe("calendar helpers (America/Los_Angeles)", () => {
  it("converts wall-clock time across DST correctly", () => {
    // PST (UTC-8) in January, PDT (UTC-7) in July.
    expect(zonedToUtc(2027, 1, 15, 9, 0, LA).toISOString()).toBe("2027-01-15T17:00:00.000Z");
    expect(zonedToUtc(2027, 7, 15, 9, 0, LA).toISOString()).toBe("2027-07-15T16:00:00.000Z");
  });

  it("handles the spring-forward gap and fall-back overlap", () => {
    // 2027-03-14 02:30 doesn't exist in LA; resolves just after the gap.
    const gap = zonedToUtc(2027, 3, 14, 2, 30, LA);
    expect(zonedParts(gap, LA).hour).toBe(3);
    // 2027-11-07 01:30 happens twice; resolves to a real 01:30.
    const overlap = zonedToUtc(2027, 11, 7, 1, 30, LA);
    expect(zonedParts(overlap, LA)).toMatchObject({ hour: 1, minute: 30 });
  });

  it("adds calendar months with month-end clamping, not 90 days", () => {
    const launch = zonedToUtc(2026, 11, 30, 10, 0, LA); // Nov 30
    const end = bootstrapEndFor(launch, LA);
    expect(zonedParts(end, LA)).toMatchObject({ year: 2027, month: 2, day: 28, hour: 10, minute: 0 });
    // Calendar months, not 90 days: Jan 31 + 3 months is Apr 30 (89 days).
    const jan31 = zonedToUtc(2027, 1, 31, 10, 0, LA);
    const jan31End = bootstrapEndFor(jan31, LA);
    expect(zonedParts(jan31End, LA)).toMatchObject({ month: 4, day: 30, hour: 10 });
    expect(jan31End.getTime()).not.toBe(jan31.getTime() + 90 * 86400000);

    const aug31 = zonedToUtc(2027, 8, 31, 12, 0, LA);
    expect(zonedParts(bootstrapEndFor(aug31, LA), LA)).toMatchObject({ month: 11, day: 30, hour: 12 });

    // Leap year clamps to Feb 29.
    const nov30_2027 = zonedToUtc(2027, 11, 30, 8, 0, LA);
    expect(zonedParts(addCalendarMonths(nov30_2027, 3, LA), LA)).toMatchObject({ year: 2028, month: 2, day: 29 });
  });

  it("keeps local clock time across a DST change", () => {
    const launch = zonedToUtc(2027, 1, 10, 9, 0, LA); // PST
    const end = bootstrapEndFor(launch, LA); // April 10, PDT
    expect(zonedParts(end, LA)).toMatchObject({ month: 4, day: 10, hour: 9, minute: 0 });
  });

  it("uses the feature timezone for month boundaries", () => {
    // 2027-02-01T05:00Z is still January 31 in LA.
    const lateJan = new Date("2027-02-01T05:00:00Z");
    expect(monthKey(lateJan, LA)).toBe("2027-01");
    expect(monthKey(lateJan, "UTC")).toBe("2027-02");
    expect(startOfNextMonth(lateJan, LA).toISOString()).toBe("2027-02-01T08:00:00.000Z");
  });
});
