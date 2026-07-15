// Workshop deletion webhook integration
// Fires when an event is deleted to remove the matching workshop,
// via our own /api/webhooks/workshop-ops proxy which holds the real API key server-side.

const PROXY_URL = "/api/webhooks/workshop-ops";

export async function sendWorkshopDeletionWebhook(eventId: string): Promise<boolean> {
  try {
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", payload: { eventId } }),
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
export function fireWorkshopDeletionWebhook(eventId: string): void {
  // Fire and forget - don't await
  sendWorkshopDeletionWebhook(eventId)
    .then((success) => {
      if (success) {
        console.log(`[Workshop Webhook] Workshop deletion completed for event ${eventId}`);
      }
    })
    .catch((error) => {
      console.error("[Workshop Webhook] Unexpected error during deletion:", error);
    });
}
