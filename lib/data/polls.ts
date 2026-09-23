// Data-access layer for Polls (migration 099). Every mutation here calls a
// SECURITY DEFINER Postgres RPC rather than writing to a table directly --
// same convention as lib/data/connectionAsync.ts -- so nothing here should
// be treated as a trust boundary, it's a thin typed wrapper only.

import { supabase } from "@/lib/supabase/client";
import { demoSafeWrite } from "@/lib/demo/demo-mode-guard";

export interface PollOption {
  id: string;
  label: string;
  position: number;
}

export interface Poll {
  id: string;
  postId: string | null;
  question: string;
  options: PollOption[];
}

export interface PollResultOption {
  optionId: string;
  label: string;
  voteCount: number;
  isMyVote: boolean;
}

function rpcError(context: string, error: unknown): null {
  console.error(`[polls] ${context}:`, error);
  return null;
}

// Creates a poll (and its options) via one RPC call, optionally attached
// to a post (postId omitted/undefined for a broadcast-only poll never
// posted into a space). Returns the new poll's id, or null on failure.
export async function createPollWithOptions(
  question: string,
  options: string[],
  postId?: string
): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await demoSafeWrite(
    () =>
      supabase!.rpc("create_poll_with_options", {
        p_question: question,
        p_options: options,
        p_post_id: postId || null,
      }),
    { context: "createPollWithOptions" }
  );

  if (error) return rpcError("createPollWithOptions", error);
  return (data as string) || null;
}

// Fetches the poll (question + ordered options) attached to a post, or
// null if that post has no poll. Batch variant below is preferred when
// loading a whole feed of posts at once.
export async function getPollForPost(postId: string): Promise<Poll | null> {
  if (!supabase) return null;

  const { data: pollRow, error: pollError } = await supabase
    .from("polls")
    .select("id, post_id, question")
    .eq("post_id", postId)
    .maybeSingle();

  if (pollError || !pollRow) return null;

  const { data: optionRows, error: optionsError } = await supabase
    .from("poll_options")
    .select("id, label, position")
    .eq("poll_id", pollRow.id)
    .order("position", { ascending: true });

  if (optionsError) return rpcError("getPollForPost", optionsError);

  return {
    id: pollRow.id,
    postId: pollRow.post_id,
    question: pollRow.question,
    options: (optionRows || []).map((o) => ({ id: o.id, label: o.label, position: o.position })),
  };
}

// One query for every poll attached to a batch of posts (a feed page),
// rather than one getPollForPost() round trip per post -- same "batch
// lookup" reasoning used elsewhere in this app's admin routes this
// session (e.g. batching profile-name lookups).
export async function getPollsForPosts(postIds: string[]): Promise<Map<string, Poll>> {
  const byPostId = new Map<string, Poll>();
  if (!supabase || postIds.length === 0) return byPostId;

  const { data: pollRows, error: pollsError } = await supabase
    .from("polls")
    .select("id, post_id, question")
    .in("post_id", postIds);

  if (pollsError || !pollRows || pollRows.length === 0) return byPostId;

  const { data: optionRows, error: optionsError } = await supabase
    .from("poll_options")
    .select("id, poll_id, label, position")
    .in("poll_id", pollRows.map((p) => p.id))
    .order("position", { ascending: true });

  if (optionsError) return byPostId;

  const optionsByPollId = new Map<string, PollOption[]>();
  for (const o of optionRows || []) {
    const list = optionsByPollId.get(o.poll_id) || [];
    list.push({ id: o.id, label: o.label, position: o.position });
    optionsByPollId.set(o.poll_id, list);
  }

  for (const p of pollRows) {
    if (!p.post_id) continue;
    byPostId.set(p.post_id, {
      id: p.id,
      postId: p.post_id,
      question: p.question,
      options: optionsByPollId.get(p.id) || [],
    });
  }

  return byPostId;
}

export async function submitPollVote(pollId: string, optionId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await demoSafeWrite(
    () => supabase!.rpc("submit_poll_vote", { p_poll_id: pollId, p_option_id: optionId }),
    { context: "submitPollVote" }
  );

  if (error) {
    console.error("[polls] submitPollVote:", error);
    return false;
  }
  return true;
}

export async function getPollResults(pollId: string): Promise<PollResultOption[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_poll_results", { p_poll_id: pollId });
  if (error) {
    console.error("[polls] getPollResults:", error);
    return [];
  }

  return (data || []).map((r: any) => ({
    optionId: r.option_id,
    label: r.label,
    voteCount: Number(r.vote_count) || 0,
    isMyVote: !!r.is_my_vote,
  }));
}
