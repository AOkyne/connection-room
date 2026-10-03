// Member-facing reads for "Your Experience Wanted" (server only). Every
// function returns only what a member may see: never an anonymous
// author's identity, never recipient lists, never anyone's email.

import type { SupabaseClient } from "@supabase/supabase-js";
import { mapQuestion } from "./supabase-store";
import { ANONYMOUS_QUESTION_AUTHOR_NAME } from "./threads";

export interface PublicQuestion {
  id: string;
  text: string;
  /** In-app only. */
  context: string | null;
  label: "Community prompt" | "Member question";
  topic: { slug: string; label: string };
  status: "open" | "closed" | "removed";
  threadPostId: string | null;
  authorName: string | null;
  responseCount: number;
  lastActivityAt: string | null;
  viewerIsAuthor: boolean;
  /** Only for the viewer's own questions. */
  own?: {
    anonymous: boolean;
    emailPermission: boolean;
    emailReview: string;
  };
}

async function topicLabels(supabase: SupabaseClient) {
  const { data } = await supabase.from("experience_topics").select("slug, label");
  return new Map((data || []).map((t) => [t.slug, t.label as string]));
}

async function displayNames(supabase: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();
  const { data } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
  return new Map((data || []).map((p) => [p.user_id, p.display_name as string]));
}

async function threadStats(supabase: SupabaseClient, threadIds: string[]) {
  const stats = new Map<string, { responses: number; last: string | null }>();
  if (threadIds.length === 0) return stats;
  const { data } = await supabase
    .from("comments")
    .select("post_id, parent_comment_id, created_at")
    .in("post_id", threadIds)
    .is("deleted_at", null);
  for (const c of data || []) {
    const s = stats.get(c.post_id) || { responses: 0, last: null };
    if (!c.parent_comment_id) s.responses += 1;
    if (!s.last || c.created_at > s.last) s.last = c.created_at;
    stats.set(c.post_id, s);
  }
  return stats;
}

export function toPublic(
  row: any,
  viewerId: string,
  topics: Map<string, string>,
  names: Map<string, string>,
  stats: Map<string, { responses: number; last: string | null }>
): PublicQuestion {
  const q = mapQuestion(row);
  const isAuthor = !!q.authorId && q.authorId === viewerId;
  const threadIds = q.threadPostIds;
  let responses = 0;
  let last: string | null = null;
  for (const t of threadIds) {
    const s = stats.get(t);
    if (!s) continue;
    responses += s.responses;
    if (s.last && (!last || s.last > last)) last = s.last;
  }
  return {
    id: q.id,
    text: q.text,
    context: row.context || null,
    label: q.source === "seed" ? "Community prompt" : "Member question",
    topic: { slug: q.topic, label: topics.get(q.topic) || q.topic },
    status: q.status,
    threadPostId: q.threadPostId,
    authorName:
      q.source === "seed"
        ? null
        : q.anonymous
          ? ANONYMOUS_QUESTION_AUTHOR_NAME
          : names.get(q.authorId || "") || "A member",
    responseCount: responses,
    lastActivityAt: last || row.first_activated_at || row.created_at,
    viewerIsAuthor: isAuthor,
    ...(isAuthor
      ? { own: { anonymous: q.anonymous, emailPermission: q.emailPermission, emailReview: q.emailReview } }
      : {}),
  };
}

/** Conversations members can browse: questions with a thread that are open (or the viewer's own). */
export async function listPublicQuestions(supabase: SupabaseClient, viewerId: string): Promise<PublicQuestion[]> {
  const { data: rows } = await supabase
    .from("experience_questions")
    .select("*")
    .not("thread_post_id", "is", null)
    .neq("status", "removed")
    .order("created_at", { ascending: false });
  const list = rows || [];
  const [topics, names, stats] = await Promise.all([
    topicLabels(supabase),
    displayNames(
      supabase,
      list.filter((r) => r.source === "member" && !r.anonymous && r.author_id).map((r) => r.author_id)
    ),
    threadStats(supabase, list.flatMap((r) => [r.thread_post_id, ...(r.previous_thread_post_ids || [])]).filter(Boolean)),
  ]);
  return list
    .filter((r) => r.status === "open" || r.author_id === viewerId)
    .map((r) => toPublic(r, viewerId, topics, names, stats))
    .sort((a, b) => (b.lastActivityAt || "").localeCompare(a.lastActivityAt || ""));
}

export async function getPublicQuestion(
  supabase: SupabaseClient,
  questionId: string,
  viewerId: string
): Promise<(PublicQuestion & { myAnonymousCommentIds: string[] }) | null> {
  const { data: row } = await supabase.from("experience_questions").select("*").eq("id", questionId).maybeSingle();
  if (!row) return null;
  const threadIds = [row.thread_post_id, ...(row.previous_thread_post_ids || [])].filter(Boolean);
  const [topics, names, stats] = await Promise.all([
    topicLabels(supabase),
    displayNames(supabase, row.source === "member" && !row.anonymous && row.author_id ? [row.author_id] : []),
    threadStats(supabase, threadIds),
  ]);
  const pub = toPublic(row, viewerId, topics, names, stats);

  // The viewer's own anonymous follow-ups (only ever told to the author).
  let myAnonymousCommentIds: string[] = [];
  if (pub.viewerIsAuthor && row.anonymous) {
    const { data } = await supabase
      .from("experience_anonymous_comments")
      .select("comment_id")
      .eq("question_id", row.id)
      .eq("real_user_id", viewerId);
    myAnonymousCommentIds = (data || []).map((r) => r.comment_id);
  }
  return { ...pub, myAnonymousCommentIds };
}

export interface MyInvitation {
  id: string;
  questionId: string;
  questionText: string;
  sentAt: string;
}

/** Invitations the viewer has received (accepted by the provider). */
export async function listMyInvitations(supabase: SupabaseClient, viewerId: string): Promise<MyInvitation[]> {
  const { data } = await supabase
    .from("experience_invitations")
    .select("id, question_id, sent_at, experience_questions(text, status)")
    .eq("user_id", viewerId)
    .eq("state", "sent")
    .order("sent_at", { ascending: false })
    .limit(20);
  return (data || [])
    .filter((r: any) => r.experience_questions && r.experience_questions.status !== "removed")
    .map((r: any) => ({ id: r.id, questionId: r.question_id, questionText: r.experience_questions.text, sentAt: r.sent_at }));
}
