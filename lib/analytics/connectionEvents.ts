import { supabase } from "@/lib/supabase/client";
import { demoSafeWrite } from "@/lib/demo/demo-mode-guard";

export type ConnectionFunnelEventType =
  | "connections_directory_viewed"
  | "member_card_viewed"
  | "member_profile_opened_from_connections"
  | "say_hello_clicked"
  | "suggested_starter_selected"
  | "first_message_sent"
  | "first_reply_received"
  | "conversation_starter_requested"
  | "suggested_member_shown"
  | "suggested_member_dismissed"
  | "suggested_member_messaged";

export interface TrackConnectionEventParams {
  eventType: ConnectionFunnelEventType;
  relatedUserId?: string | null;
  connectionId?: string | null;
  filter?: string | null;
}

// Fire-and-forget, same resilience pattern as trackNewsletterEvent() --
// never lets a tracking failure interrupt the actual flow it's observing.
// Never pass message text here -- connection_funnel_events (migration
// 098) has no content column at all, only ids/flags.
export async function trackConnectionEvent(params: TrackConnectionEventParams): Promise<void> {
  if (!supabase) return;
  const client = supabase;

  try {
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return;

    await demoSafeWrite(
      () =>
        client.from("connection_funnel_events").insert({
          event_type: params.eventType,
          user_id: userId,
          related_user_id: params.relatedUserId || null,
          connection_id: params.connectionId || null,
          filter: params.filter || null,
        }),
      { context: "trackConnectionEvent" }
    );
  } catch (err) {
    console.warn("trackConnectionEvent failed (non-fatal):", err);
  }
}
