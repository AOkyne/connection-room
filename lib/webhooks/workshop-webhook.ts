// Workshop Ops webhook integration
// Sends registration data in real-time to workshops.trevorjamesla.com via our
// own /api/webhooks/workshop-ops proxy, which holds the real API key server-side.

const PROXY_URL = "/api/webhooks/workshop-ops";

export interface WorkshopRegistration {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: "registered" | "interested" | "attended" | "cancelled";
  registeredAt: string;
}

export interface WorkshopRegistrationsPayload {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  registrations: WorkshopRegistration[];
}

export async function sendEventRegistrationsWebhook(
  eventId: string,
  eventTitle: string,
  eventDate: string,
  registrations: WorkshopRegistration[]
): Promise<boolean> {
  try {
    const payload: WorkshopRegistrationsPayload = {
      eventId,
      eventTitle,
      eventDate,
      registrations,
    };

    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "registrations", payload }),
    });

    if (!response.ok) {
      console.error(
        `Workshop webhook failed with status ${response.status}:`,
        await response.text()
      );
      return false;
    }

    console.log(
      `[Workshop Webhook] Sent ${registrations.length} registrations for event ${eventTitle}`
    );
    return true;
  } catch (error) {
    console.error("[Workshop Webhook] Error sending webhook:", error);
    // Don't throw - webhook failures shouldn't break the registration flow
    return false;
  }
}

// Debounced webhook sender - batches updates for the same event
const webhookQueue = new Map<
  string,
  {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    registrations: WorkshopRegistration[];
    timeoutId: ReturnType<typeof setTimeout>;
  }
>();

export function queueEventRegistrationsWebhook(
  eventId: string,
  eventTitle: string,
  eventDate: string,
  registrations: WorkshopRegistration[],
  delayMs: number = 2000
): void {
  // Clear existing timeout for this event
  const existing = webhookQueue.get(eventId);
  if (existing) {
    clearTimeout(existing.timeoutId);
  }

  // Schedule new webhook with delay for batching
  const timeoutId = setTimeout(() => {
    sendEventRegistrationsWebhook(eventId, eventTitle, eventDate, registrations)
      .then(() => {
        webhookQueue.delete(eventId);
      })
      .catch(() => {
        webhookQueue.delete(eventId);
      });
  }, delayMs);

  webhookQueue.set(eventId, {
    eventId,
    eventTitle,
    eventDate,
    registrations,
    timeoutId,
  });
}
