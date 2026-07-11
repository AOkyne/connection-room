// Workshop Ops webhook integration
// Sends registration data in real-time to workshops.trevorjamesla.com

const WORKSHOP_API_URL = "https://workshops.trevorjamesla.com/api/registrations";
const WORKSHOP_API_KEY = "Xensationx555";

export interface WorkshopRegistrationPayload {
  eventId: string;
  eventTitle: string;
  userId: string;
  name: string;
  email: string;
  status: "registered" | "interested" | "attended" | "cancelled";
  registeredAt: string;
  action: "create" | "update" | "cancel";
}

export async function sendRegistrationWebhook(
  payload: WorkshopRegistrationPayload
): Promise<boolean> {
  try {
    const response = await fetch(WORKSHOP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WORKSHOP_API_KEY}`,
      },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(),
        source: "connection-room",
      }),
    });

    if (!response.ok) {
      console.error(
        `Workshop webhook failed with status ${response.status}:`,
        await response.text()
      );
      return false;
    }

    console.log(
      `[Workshop Webhook] ${payload.action} registration sent for ${payload.name} (${payload.email})`
    );
    return true;
  } catch (error) {
    console.error("[Workshop Webhook] Error sending webhook:", error);
    // Don't throw - webhook failures shouldn't break the registration flow
    return false;
  }
}

export async function sendBulkRegistrationsWebhook(
  eventId: string,
  registrations: Array<{
    userId: string;
    name: string;
    email: string;
    status: "registered" | "interested" | "attended" | "cancelled";
    registeredAt: string;
  }>
): Promise<boolean> {
  try {
    const response = await fetch(`${WORKSHOP_API_URL}/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WORKSHOP_API_KEY}`,
      },
      body: JSON.stringify({
        eventId,
        registrations,
        timestamp: new Date().toISOString(),
        source: "connection-room",
      }),
    });

    if (!response.ok) {
      console.error(
        `Workshop bulk webhook failed with status ${response.status}:`,
        await response.text()
      );
      return false;
    }

    console.log(
      `[Workshop Webhook] Bulk sync sent for event ${eventId} (${registrations.length} registrations)`
    );
    return true;
  } catch (error) {
    console.error("[Workshop Webhook] Error sending bulk webhook:", error);
    return false;
  }
}
