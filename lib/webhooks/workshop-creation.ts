// Workshop creation webhook integration
// Fires when a new event is created to automatically create a matching workshop

const WORKSHOP_API_URL = "https://workshops.trevorjamesla.com/api/workshops";
const WORKSHOP_API_KEY = "Xensationx555";

export interface WorkshopCreationPayload {
  eventId: string;
  eventTitle: string;
  eventDate: string; // YYYY-MM-DD format
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  location?: string;
  description?: string;
}

export interface WorkshopCreationResponse {
  workshopId: string;
  checkinUrl: string;
  feedbackUrl: string;
}

export async function sendWorkshopCreationWebhook(
  payload: WorkshopCreationPayload
): Promise<WorkshopCreationResponse | null> {
  try {
    const response = await fetch(WORKSHOP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WORKSHOP_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[Workshop Webhook] Failed with status ${response.status}:`,
        await response.text()
      );
      return null;
    }

    const data: WorkshopCreationResponse = await response.json();
    console.log(
      `[Workshop Webhook] Successfully created workshop for event "${payload.eventTitle}" (ID: ${data.workshopId})`
    );
    return data;
  } catch (error) {
    console.error("[Workshop Webhook] Error creating workshop:", error);
    return null;
  }
}

// Fire workshop creation webhook asynchronously (non-blocking)
// Optional: provide a callback to handle the response and update the event record
export function fireWorkshopCreationWebhook(
  payload: WorkshopCreationPayload,
  onSuccess?: (response: WorkshopCreationResponse) => Promise<void>
): void {
  // Fire and forget - don't await
  sendWorkshopCreationWebhook(payload)
    .then(async (result) => {
      if (result) {
        console.log(
          `[Workshop Webhook] Workshop created: ${result.workshopId}`,
          `\n  Checkin: ${result.checkinUrl}`,
          `\n  Feedback: ${result.feedbackUrl}`
        );

        // If callback provided, update the event with workshop data
        if (onSuccess) {
          try {
            await onSuccess(result);
            console.log(`[Workshop Webhook] Successfully updated event ${payload.eventId} with workshop data`);
          } catch (error) {
            console.error(`[Workshop Webhook] Failed to update event with workshop data:`, error);
          }
        }
      }
    })
    .catch((error) => {
      console.error("[Workshop Webhook] Unexpected error:", error);
    });
}
