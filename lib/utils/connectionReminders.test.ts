import { describe, it, expect } from "vitest";
import { isPastDeadline, isHalfwayReminderDue, isClosingSoonReminderDue, getDueLiveReminderKey } from "./connectionReminders";

describe("isPastDeadline", () => {
  it("is false before the deadline and true after", () => {
    const deadline = new Date("2026-01-02T00:00:00Z");
    expect(isPastDeadline(deadline, new Date("2026-01-01T23:59:59Z"))).toBe(false);
    expect(isPastDeadline(deadline, new Date("2026-01-02T00:00:01Z"))).toBe(true);
  });
});

describe("isHalfwayReminderDue", () => {
  const opened = new Date("2026-01-01T00:00:00Z");
  const deadline = new Date("2026-01-03T00:00:00Z"); // 48h window, midpoint = Jan 2 00:00 UTC

  it("is false before the midpoint", () => {
    expect(isHalfwayReminderDue(opened, deadline, new Date("2026-01-01T12:00:00Z"))).toBe(false);
  });

  it("is true from the midpoint up to (not including) the deadline", () => {
    expect(isHalfwayReminderDue(opened, deadline, new Date("2026-01-02T00:00:00Z"))).toBe(true);
    expect(isHalfwayReminderDue(opened, deadline, new Date("2026-01-02T12:00:00Z"))).toBe(true);
  });

  it("is false once the deadline has passed", () => {
    expect(isHalfwayReminderDue(opened, deadline, new Date("2026-01-03T00:00:00Z"))).toBe(false);
  });
});

describe("isClosingSoonReminderDue", () => {
  const deadline = new Date("2026-01-03T00:00:00Z");

  it("is false more than 6 hours before the deadline", () => {
    expect(isClosingSoonReminderDue(deadline, new Date("2026-01-02T17:00:00Z"))).toBe(false);
  });

  it("is true within the last 6 hours", () => {
    expect(isClosingSoonReminderDue(deadline, new Date("2026-01-02T19:00:00Z"))).toBe(true);
    expect(isClosingSoonReminderDue(deadline, new Date("2026-01-02T23:59:00Z"))).toBe(true);
  });

  it("is false once the deadline has passed", () => {
    expect(isClosingSoonReminderDue(deadline, new Date("2026-01-03T00:00:01Z"))).toBe(false);
  });
});

describe("getDueLiveReminderKey", () => {
  const scheduledStartAt = new Date("2026-01-02T12:00:00Z");

  it("returns null more than 24 hours out", () => {
    expect(getDueLiveReminderKey(scheduledStartAt, new Date("2026-01-01T11:00:00Z"))).toBeNull();
  });

  it("returns live_24hour between 1 and 24 hours out", () => {
    expect(getDueLiveReminderKey(scheduledStartAt, new Date("2026-01-01T13:00:00Z"))).toBe("live_24hour");
  });

  it("returns live_1hour between 10 and 60 minutes out", () => {
    expect(getDueLiveReminderKey(scheduledStartAt, new Date("2026-01-02T11:30:00Z"))).toBe("live_1hour");
  });

  it("returns live_10min within the last 10 minutes", () => {
    expect(getDueLiveReminderKey(scheduledStartAt, new Date("2026-01-02T11:55:00Z"))).toBe("live_10min");
  });

  it("returns null after the scheduled start has passed", () => {
    expect(getDueLiveReminderKey(scheduledStartAt, new Date("2026-01-02T12:00:01Z"))).toBeNull();
  });
});
