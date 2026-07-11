// Workshop deletion webhook integration
// Fires when an event is deleted to remove the matching workshop

const WORKSHOP_API_URL = "https://workshops.trevorjamesla.com/api/workshops";
const WORKSHOP_API_KEY = "Xensationx555";

export async function sendWorkshopDeletionWebhook(
  eventId: string,
  workshopId?: string
): Promise<boolean> {
  try {
    // If we have a workshopId from the creation response, use it
    // Otherwise use eventId as the identifier
    const identifier = workshopId || eventId;

    const response = await fetch(`${WORKSHOP_API_URL}/${identifier}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${WORKSHOP_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error(
        `[Workshop Webhook] Delete failed with status ${response.status}:`,
        await response.text()
      );
      return false;
    }

    console.log(
      `[Workshop Webhook] Successfully deleted workshop for event ${eventId}`
    );
    return true;
  } catch (error) {
    console.error("[Workshop Webhook] Error deleting workshop:", error);
    return false;
  }
}

// Fire workshop deletion webhook asynchronously (non-blocking)
export function fireWorkshopDeletionWebhook(
  eventId: string,
  workshopId?: string
): void {
  // Fire and forget - don't await
  sendWorkshopDeletionWebhook(eventId, workshopId)
    .then((success) => {
      if (success) {
        console.log(`[Workshop Webhook] Workshop deletion completed for event ${eventId}`);
      }
    })
    .catch((error) => {
      console.error("[Workshop Webhook] Unexpected error during deletion:", error);
    });
}
