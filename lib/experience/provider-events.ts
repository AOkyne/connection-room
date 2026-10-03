// Normalizes email-provider webhook payloads (SMTP2GO) into the few facts
// this app acts on. Field names vary between providers and webhook
// formats, so several are accepted; verify against SMTP2GO's "test
// webhook" when connecting it (docs/your-experience-wanted.md).
//
// What we do with events is deliberately one-directional and idempotent:
// a hard bounce or complaint adds a permanent suppression; nothing ever
// removes one, and no event changes an invitation's sent/counted state.
// So duplicate deliveries and out-of-order events can't resend anything
// or reset a member's cooldown.

import { createHash } from "crypto";

export interface ProviderEvent {
  eventType: string;
  email: string | null;
  messageId: string | null;
  providerEventId: string;
  occurredAt: string | null;
  suppress: "hard_bounce" | "complaint" | null;
  unsubscribe: boolean;
}

function pick(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export function normalizeProviderEvent(raw: Record<string, unknown>): ProviderEvent {
  const eventType = (pick(raw, ["event", "event_type", "type"]) || "unknown").toLowerCase();
  const email = pick(raw, ["rcpt", "recipient", "email", "to"])?.toLowerCase() || null;
  const messageId = pick(raw, ["message-id", "message_id", "Message-Id", "messageId"]);
  const occurredAt = pick(raw, ["time", "timestamp", "sendtime", "occurred_at"]);
  const bounceKind = (pick(raw, ["bounce", "bounce_type", "bounce-type", "type_of_bounce"]) || "").toLowerCase();

  const explicitId = pick(raw, ["id", "event_id", "email_id"]);
  // No provider id: hash the event's identifying fields so a redelivery
  // of the same webhook dedupes on the same key.
  const providerEventId =
    explicitId && explicitId !== messageId
      ? `${eventType}:${explicitId}`
      : createHash("sha256").update(JSON.stringify([eventType, email, messageId, occurredAt, bounceKind])).digest("hex");

  let suppress: ProviderEvent["suppress"] = null;
  if (eventType.includes("spam") || eventType.includes("complain")) suppress = "complaint";
  else if (eventType.includes("bounce") && (bounceKind.includes("hard") || bounceKind === "" || eventType.includes("hard"))) {
    suppress = bounceKind.includes("soft") ? null : "hard_bounce";
  }
  if (eventType.includes("soft")) suppress = null;

  return {
    eventType,
    email,
    messageId,
    providerEventId,
    occurredAt,
    suppress,
    unsubscribe: eventType.includes("unsubscribe"),
  };
}
