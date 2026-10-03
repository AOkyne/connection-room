import { describe, it, expect } from "vitest";
import { normalizeProviderEvent } from "./provider-events";

describe("provider webhook events", () => {
  it("suppresses on hard bounces and complaints, not soft bounces or deliveries", () => {
    expect(normalizeProviderEvent({ event: "bounce", bounce: "hard", rcpt: "A@x.test" }).suppress).toBe("hard_bounce");
    expect(normalizeProviderEvent({ event: "bounce", bounce: "soft", rcpt: "a@x.test" }).suppress).toBeNull();
    expect(normalizeProviderEvent({ event: "spam", rcpt: "a@x.test" }).suppress).toBe("complaint");
    expect(normalizeProviderEvent({ event: "delivered", rcpt: "a@x.test" }).suppress).toBeNull();
    expect(normalizeProviderEvent({ event: "bounce", bounce: "hard", rcpt: "A@x.test" }).email).toBe("a@x.test");
  });

  it("gives a redelivered webhook the same dedup key, and different events different keys", () => {
    const payload = { event: "bounce", bounce: "hard", rcpt: "a@x.test", "message-id": "<m1>", time: "2027-01-01T00:00:00Z" };
    expect(normalizeProviderEvent(payload).providerEventId).toBe(normalizeProviderEvent({ ...payload }).providerEventId);
    expect(normalizeProviderEvent(payload).providerEventId).not.toBe(
      normalizeProviderEvent({ ...payload, event: "delivered" }).providerEventId
    );
  });

  it("flags provider-level unsubscribes", () => {
    expect(normalizeProviderEvent({ event: "unsubscribe", rcpt: "a@x.test" }).unsubscribe).toBe(true);
  });
});
