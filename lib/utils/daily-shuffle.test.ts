import { describe, expect, it } from "vitest";
import { dailyShuffle, laDateKey, seededShuffle } from "./daily-shuffle";

const people = Array.from({ length: 50 }, (_, i) => `member-${i}`);

describe("dailyShuffle", () => {
  it("keeps everyone, with no one repeated", () => {
    const out = dailyShuffle(people, "me", "directory");
    expect(out).toHaveLength(50);
    expect(new Set(out).size).toBe(50);
    expect([...out].sort()).toEqual([...people].sort());
  });

  it("is the same all day for the same member", () => {
    const morning = new Date("2026-11-23T08:00:00-08:00");
    const night = new Date("2026-11-23T23:30:00-08:00");
    expect(dailyShuffle(people, "me", "directory", morning)).toEqual(dailyShuffle(people, "me", "directory", night));
  });

  it("changes the next day, and differs between members", () => {
    const today = new Date("2026-11-23T12:00:00-08:00");
    const tomorrow = new Date("2026-11-24T12:00:00-08:00");
    expect(dailyShuffle(people, "me", "directory", today)).not.toEqual(dailyShuffle(people, "me", "directory", tomorrow));
    expect(dailyShuffle(people, "me", "directory", today)).not.toEqual(dailyShuffle(people, "someone-else", "directory", today));
  });

  it("rolls over at midnight Los Angeles time, not UTC", () => {
    expect(laDateKey(new Date("2026-11-24T07:59:00Z"))).toBe("2026-11-23");
    expect(laDateKey(new Date("2026-11-24T08:01:00Z"))).toBe("2026-11-24");
  });

  it("gives every member a fair turn at the top over time", () => {
    const firsts = new Set<string>();
    for (let d = 0; d < 200; d++) firsts.add(seededShuffle(people, `me:${d}`)[0]);
    expect(firsts.size).toBeGreaterThan(35);
  });
});
