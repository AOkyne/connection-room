import { supabase } from "@/lib/supabase/client";
import { demoSafeWrite } from "@/lib/demo/demo-mode-guard";

export type NewsletterEventType =
  | "newsletter_question_viewed"
  | "question_response_started"
  | "question_response_submitted"
  | "question_reply_started"
  | "question_reply_submitted";

export interface TrackNewsletterEventParams {
  eventType: NewsletterEventType;
  questionPostId: string;
  spaceId: string;
  campaign?: string | null;
  source?: string | null;
  signedInOnArrival: boolean;
  isReply?: boolean;
  userId?: string | null;
}

// Fire-and-forget: never lets a tracking failure break the actual user
// flow it's observing (matches the console.warn-and-continue style used
// throughout lib/data/supabase-posts.ts). Never pass response/comment
// text here -- newsletter_events (migration 090) has no content column
// at all, so there's structurally nowhere for it to go, but the
// parameter list itself is kept to ids/flags only as a second guard.
export async function trackNewsletterEvent(params: TrackNewsletterEventParams): Promise<void> {
  if (!supabase) return;
  const client = supabase;

  try {
    await demoSafeWrite(
      () =>
        client.from("newsletter_events").insert({
          event_type: params.eventType,
          question_post_id: params.questionPostId,
          space_id: params.spaceId,
          user_id: params.userId || null,
          campaign: params.campaign || null,
          source: params.source || null,
          signed_in_on_arrival: params.signedInOnArrival,
          is_reply: params.isReply ?? null,
        }),
      { context: "trackNewsletterEvent" }
    );
  } catch (err) {
    console.warn("trackNewsletterEvent failed (non-fatal):", err);
  }
}
