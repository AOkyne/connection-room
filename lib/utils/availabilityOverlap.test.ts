import { describe, it, expect } from "vitest";
import { calculateOverlappingSlots } from "./availabilityOverlap";

describe("calculateOverlappingSlots", () => {
  it("returns no slots when windows do not overlap at all", () => {
    const mine = [{ startsAt: new Date("2026-01-01T10:00:00Z"), endsAt: new Date("2026-01-01T11:00:00Z") }];
    const theirs = [{ startsAt: new Date("2026-01-01T12:00:00Z"), endsAt: new Date("2026-01-01T13:00:00Z") }];
    expect(calculateOverlappingSlots(mine, theirs)).toEqual([]);
  });

  it("returns no slots when the overlap is shorter than the slot length", () => {
    const mine = [{ startsAt: new Date("2026-01-01T10:00:00Z"), endsAt: new Date("2026-01-01T10:10:00Z") }];
    const theirs = [{ startsAt: new Date("2026-01-01T10:05:00Z"), endsAt: new Date("2026-01-01T10:30:00Z") }];
    expect(calculateOverlappingSlots(mine, theirs, 20)).toEqual([]);
  });

  it("produces one slot for an exact 20-minute overlap", () => {
    const mine = [{ startsAt: new Date("2026-01-01T10:00:00Z"), endsAt: new Date("2026-01-01T11:00:00Z") }];
    const theirs = [{ startsAt: new Date("2026-01-01T10:40:00Z"), endsAt: new Date("2026-01-01T11:30:00Z") }];
    const slots = calculateOverlappingSlots(mine, theirs, 20);
    expect(slots).toEqual([
      { startsAt: new Date("2026-01-01T10:40:00Z"), endsAt: new Date("2026-01-01T11:00:00Z") },
    ]);
  });

  it("produces multiple discrete slots across a longer overlap", () => {
    const mine = [{ startsAt: new Date("2026-01-01T09:00:00Z"), endsAt: new Date("2026-01-01T11:00:00Z") }];
    const theirs = [{ startsAt: new Date("2026-01-01T09:00:00Z"), endsAt: new Date("2026-01-01T11:00:00Z") }];
    const slots = calculateOverlappingSlots(mine, theirs, 20);
    expect(slots).toHaveLength(6); // 2 hours / 20 minutes
    expect(slots[0].startsAt).toEqual(new Date("2026-01-01T09:00:00Z"));
    expect(slots[5].startsAt).toEqual(new Date("2026-01-01T10:40:00Z"));
  });

  it("handles multiple windows per side and de-duplicates identical slots", () => {
    const mine = [
      { startsAt: new Date("2026-01-01T09:00:00Z"), endsAt: new Date("2026-01-01T10:00:00Z") },
      { startsAt: new Date("2026-01-01T14:00:00Z"), endsAt: new Date("2026-01-01T15:00:00Z") },
    ];
    const theirs = [{ startsAt: new Date("2026-01-01T09:00:00Z"), endsAt: new Date("2026-01-01T09:20:00Z") }];
    const slots = calculateOverlappingSlots(mine, theirs, 20);
    expect(slots).toEqual([
      { startsAt: new Date("2026-01-01T09:00:00Z"), endsAt: new Date("2026-01-01T09:20:00Z") },
    ]);
  });

  it("computes overlap correctly across a DST transition (UTC instants, not wall-clock)", () => {
    // US DST spring-forward 2026-03-08 02:00 local -> 03:00 local. Expressed
    // in UTC these are still just plain, monotonically increasing instants,
    // so the calculation must not need any timezone awareness to be correct.
    const mine = [{ startsAt: new Date("2026-03-08T06:00:00Z"), endsAt: new Date("2026-03-08T09:00:00Z") }];
    const theirs = [{ startsAt: new Date("2026-03-08T06:30:00Z"), endsAt: new Date("2026-03-08T07:10:00Z") }];
    const slots = calculateOverlappingSlots(mine, theirs, 20);
    expect(slots).toHaveLength(2);
    expect(slots[0].startsAt).toEqual(new Date("2026-03-08T06:30:00Z"));
    expect(slots[1].startsAt).toEqual(new Date("2026-03-08T06:50:00Z"));
  });
});
