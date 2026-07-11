// Workshop update webhook integration
// Fires when an event is updated to sync changes to the workshop

const WORKSHOP_UPDATE_URL = "https://workshops.trevorjamesla.com/api/workshops-update";
const WORKSHOP_API_KEY = "Xensationx555";

export interface WorkshopUpdatePayload {
  eventId: string;
  eventTitle?: string;
  eventDate?: string; // YYYY-MM-DD format
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  location?: string;
  description?: string;
}

export async function sendWorkshopUpdateWebhook(
  payload: WorkshopUpdatePayload
): Promise<boolean> {
  try {
    // Only include fields that are defined (partial update)
    const body: any = { eventId: payload.eventId };
    if (payload.eventTitle !== undefined) body.eventTitle = payload.eventTitle;
    if (payload.eventDate !== undefined) body.eventDate = payload.eventDate;
    if (payload.startTime !== undefined) body.startTime = payload.startTime;
    if (payload.endTime !== undefined) body.endTime = payload.endTime;
    if (payload.location !== undefined) body.location = payload.location;
    if (payload.description !== undefined) body.description = payload.description;

    const response = await fetch(WORKSHOP_UPDATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WORKSHOP_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(
        `[Workshop Webhook] Update failed with status ${response.status}:`,
        await response.text()
      );
      return false;
    }

    console.log(
      `[Workshop Webhook] Successfully updated workshop for event ${payload.eventId}`
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
