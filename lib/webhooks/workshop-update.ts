// Workshop update webhook integration
// Fires when an event is updated to sync changes to the workshop

const WORKSHOP_API_URL = "https://workshops.trevorjamesla.com/api/workshops";
const WORKSHOP_API_KEY = "Xensationx555";

export interface WorkshopUpdatePayload {
  eventId: string;
  eventTitle: string;
  eventDate: string; // YYYY-MM-DD format
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  location?: string;
  description?: string;
  workshopId?: string; // If updating an existing workshop
}

export async function sendWorkshopUpdateWebhook(
  payload: WorkshopUpdatePayload
): Promise<boolean> {
  try {
    const url = payload.workshopId
      ? `${WORKSHOP_API_URL}/${payload.workshopId}`
      : `${WORKSHOP_API_URL}/${payload.eventId}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WORKSHOP_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[Workshop Webhook] Update failed with status ${response.status}:`,
        await response.text()
      );
      return false;
    }

    console.log(
      `[Workshop Webhook] Successfully updated workshop for event "${payload.eventTitle}"`
    );
    return true;
  } catch (error) {
    console.error("[Workshop Webhook] Error updating workshop:", error);
    return false;
  }
}

// Fire workshop update webhook asynchronously (non-blocking)
export function fireWorkshopUpdateWebhook(payload: WorkshopUpdatePayload): void {
  // Fire and forget - don't await
  sendWorkshopUpdateWebhook(payload)
    .then((success) => {
      if (success) {
        console.log(
          `[Workshop Webhook] Workshop update completed for event ${payload.eventId}`
        );
      }
    })
    .catch((error) => {
      console.error("[Workshop Webhook] Unexpected error during update:", error);
    });
}
