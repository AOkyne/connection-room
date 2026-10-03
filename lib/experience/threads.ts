// Server helpers linking discussion threads (posts/comments) back to
// "Your Experience Wanted" questions, including anonymous authorship.
// Service-role client only.

import type { SupabaseClient } from "@supabase/supabase-js";

export const EXPERIENCE_SPACE_ID = "your-experience";
export const ANONYMOUS_QUESTION_AUTHOR_NAME = "A member";
export const ANONYMOUS_FOLLOWUP_AUTHOR_NAME = "Question author";
export const COMMUNITY_PROMPT_AUTHOR_NAME = "Community prompt";

export interface ThreadQuestion {
  id: string;
  source: "seed" | "member";
  authorId: string | null;
  anonymous: boolean;
}

/** The question whose current or earlier thread is `postId`, if any. */
export async function findQuestionByThreadPost(supabase: SupabaseClient, postId: string): Promise<ThreadQuestion | null> {
  const { data } = await supabase
    .from("experience_questions")
    .select("id, source, author_id, anonymous")
    .or(`thread_post_id.eq.${postId},previous_thread_post_ids.cs.{${postId}}`)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, source: data.source, authorId: data.author_id, anonymous: !!data.anonymous };
}

/** comment id -> real author, for follow-ups posted anonymously. */
export async function realAuthorsOfComments(supabase: SupabaseClient, commentIds: string[]): Promise<Map<string, string>> {
  const ids = commentIds.filter(Boolean);
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from("experience_anonymous_comments").select("comment_id, real_user_id").in("comment_id", ids);
  return new Map((data || []).map((r) => [r.comment_id, r.real_user_id]));
}
