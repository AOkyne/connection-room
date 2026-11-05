// Server side of the Lento Room: who is asking (a Lento room session, or the
// host signed in as a Connection Room admin), and everything they can do.
// Service-role only -- the tables have no browser grants (migration 107) --
// and every function here is reached only after resolveRoomActor().
//
// Clients never see member ids or sub hashes: messages carry the author's
// chosen display name, a host flag and whether the message is the viewer's.

import { NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/require-admin";
import { sha256Hex } from "./pass";
import { opensLentoRoom, readSessionValue, roomSecret, ROOM_COOKIE } from "./session";
import { SEED_PROMPTS, type PromptSlot } from "./prompt-seed";
import { dueSlots, normalizeSchedule, pickPrompt, SLOTS, type RoomSchedule } from "./schedule";

export const MOODS = [
  { id: "in-my-head", label: "In my head" },
  { id: "anxious", label: "Feeling anxious" },
  { id: "hopeful", label: "Hopeful" },
  { id: "grounded", label: "More grounded" },
  { id: "listening", label: "Just listening" },
] as const;
const MOOD_IDS = new Set<string>(MOODS.map((m) => m.id));

export const REACTIONS = [
  { id: "relate", label: "I relate" },
  { id: "thanks", label: "Thank you for sharing" },
  { id: "with_you", label: "I’m with you" },
] as const;
type ReactionKind = (typeof REACTIONS)[number]["id"];
const REACTION_IDS = new Set<string>(REACTIONS.map((r) => r.id));

export const MAX_BODY = 4000;
export const MAX_NAME = 40;
export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_POSTS_PER_WINDOW = 15;
const MAX_REACTIONS_PER_WINDOW = 80;
const PAGE_SIZE = 30;

export interface MemberRow {
  id: string;
  sub_hash: string;
  display_name: string | null;
  is_host: boolean;
  welcomed_at: string | null;
  last_read_at: string | null;
  restricted_at: string | null;
  notify_replies: boolean;
  notify_followed: boolean;
  notify_topics: boolean;
  notify_digest: boolean;
}

export type RoomActor =
  | { ok: true; member: MemberRow; via: "lento" | "host"; supabase: SupabaseClient }
  | { ok: false; status: number; reason: "no_session" | "restricted" | "misconfigured" };

export function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key) : null;
}

async function getOrCreateMember(supabase: SupabaseClient, subHash: string, isHost: boolean): Promise<MemberRow | null> {
  const cols =
    "id, sub_hash, display_name, is_host, welcomed_at, last_read_at, restricted_at, notify_replies, notify_followed, notify_topics, notify_digest";
  const now = new Date().toISOString();
  const { data: existing } = await supabase.from("lento_room_members").select(cols).eq("sub_hash", subHash).maybeSingle();
  if (existing) {
    return existing as MemberRow;
  }
  // Upsert so two first visits at once still give one identity.
  const { data } = await supabase
    .from("lento_room_members")
    .upsert({ sub_hash: subHash, is_host: isHost, last_entry_at: now }, { onConflict: "sub_hash" })
    .select(cols)
    .single();
  return (data as MemberRow) || null;
}

/**
 * A Lento room session whose rooms include "lento", or else the host:
 * a Connection Room admin's Bearer token. An ordinary Connection Room login
 * never opens the room.
 */
export async function resolveRoomActor(request: NextRequest): Promise<RoomActor> {
  const supabase = serviceClient();
  if (!supabase) return { ok: false, status: 500, reason: "misconfigured" };

  const session = readSessionValue(request.cookies.get(ROOM_COOKIE)?.value, roomSecret());
  let member: MemberRow | null = null;
  let via: "lento" | "host" = "lento";

  if (opensLentoRoom(session)) {
    member = await getOrCreateMember(supabase, sha256Hex(session.sub), false);
  } else if (request.headers.get("authorization")) {
    const admin = await requireAdmin(request);
    if (admin.ok) {
      member = await getOrCreateMember(supabase, sha256Hex(`host:${admin.userId}`), true);
      via = "host";
    }
  }

  if (!member) return { ok: false, status: 401, reason: "no_session" };
  if (member.restricted_at) return { ok: false, status: 403, reason: "restricted" };
  return { ok: true, member, via, supabase };
}

// ---------------------------------------------------------------- members

export function cleanDisplayName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  return name.length >= 2 ? name : null;
}

export function publicMe(member: MemberRow, via: "lento" | "host") {
  return {
    displayName: member.display_name,
    welcomed: !!member.welcomed_at && !!member.display_name,
    isHost: member.is_host,
    via,
    lastReadAt: member.last_read_at,
    prefs: {
      replies: member.notify_replies,
      followed: member.notify_followed,
      topics: member.notify_topics,
      digest: member.notify_digest,
    },
  };
}

// ---------------------------------------------------------------- messages

interface MessageRow {
  id: string;
  member_id: string | null;
  kind: "message" | "checkin" | "question" | "prompt";
  parent_id: string | null;
  body: string;
  mood: string | null;
  wants: string | null;
  prompt_slot: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  removed_at: string | null;
  author: { display_name: string | null; is_host: boolean } | null;
}

// Messages relate to members three ways (author, reactions, follows), so the
// author link is named explicitly.
const MESSAGE_COLS =
  "id, member_id, kind, parent_id, body, mood, wants, prompt_slot, created_at, edited_at, deleted_at, removed_at, author:lento_room_members!lento_room_messages_member_id_fkey(display_name, is_host)";

export interface PublicMessage {
  id: string;
  kind: MessageRow["kind"];
  parentId: string | null;
  body: string;
  mood: string | null;
  wants: string | null;
  promptSlot: string | null;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  author: { name: string; isHost: boolean } | null;
  isMine: boolean;
  canEdit: boolean;
  replyCount: number;
  reactions: Record<ReactionKind, number>;
  myReactions: ReactionKind[];
}

async function decorate(supabase: SupabaseClient, rows: MessageRow[], viewer: MemberRow, withReplyCounts: boolean): Promise<PublicMessage[]> {
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return [];
  const [{ data: reactions }, replies] = await Promise.all([
    supabase.from("lento_room_reactions").select("message_id, member_id, kind").in("message_id", ids),
    withReplyCounts
      ? supabase
          .from("lento_room_messages")
          .select("parent_id")
          .in("parent_id", ids)
          .is("deleted_at", null)
          .is("removed_at", null)
      : Promise.resolve({ data: [] as { parent_id: string }[] }),
  ]);
  const replyCount = new Map<string, number>();
  for (const r of (replies.data || []) as { parent_id: string }[]) replyCount.set(r.parent_id, (replyCount.get(r.parent_id) || 0) + 1);

  const now = Date.now();
  return rows
    .map((r) => {
      const mine = r.member_id === viewer.id;
      const counts: Record<ReactionKind, number> = { relate: 0, thanks: 0, with_you: 0 };
      const myReactions: ReactionKind[] = [];
      for (const x of (reactions || []) as { message_id: string; member_id: string; kind: ReactionKind }[]) {
        if (x.message_id !== r.id) continue;
        counts[x.kind] = (counts[x.kind] || 0) + 1;
        if (x.member_id === viewer.id) myReactions.push(x.kind);
      }
      const gone = !!(r.deleted_at || r.removed_at);
      return {
        id: r.id,
        kind: r.kind,
        parentId: r.parent_id,
        body: gone ? "" : r.body,
        mood: gone ? null : r.mood,
        wants: r.wants,
        promptSlot: r.prompt_slot,
        createdAt: r.created_at,
        editedAt: r.edited_at,
        deleted: gone,
        author: r.kind === "prompt" || !r.author ? null : { name: r.author.display_name || "A member", isHost: r.author.is_host },
        isMine: mine,
        canEdit: mine && !gone && r.kind !== "prompt" && now - new Date(r.created_at).getTime() < EDIT_WINDOW_MS,
        replyCount: replyCount.get(r.id) || 0,
        reactions: counts,
        myReactions,
      };
    })
    // A deleted message stays only as a placeholder when people replied to it.
    .filter((m) => !m.deleted || m.replyCount > 0 || m.parentId !== null);
}

/** Top-level messages, oldest first within the page. `before` pages back, `after` fetches newer. */
export async function listMessages(
  supabase: SupabaseClient,
  viewer: MemberRow,
  opts: { before?: string | null; after?: string | null }
): Promise<{ messages: PublicMessage[]; hasMore: boolean }> {
  let q = supabase.from("lento_room_messages").select(MESSAGE_COLS).is("parent_id", null);
  if (opts.after) {
    q = q.gt("created_at", opts.after).order("created_at", { ascending: true }).limit(100);
  } else {
    if (opts.before) q = q.lt("created_at", opts.before);
    q = q.order("created_at", { ascending: false }).limit(PAGE_SIZE + 1);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let rows = (data || []) as unknown as MessageRow[];
  let hasMore = false;
  if (!opts.after) {
    hasMore = rows.length > PAGE_SIZE;
    rows = rows.slice(0, PAGE_SIZE).reverse();
  }
  return { messages: await decorate(supabase, rows, viewer, true), hasMore };
}

export async function getThread(supabase: SupabaseClient, viewer: MemberRow, id: string) {
  const [{ data: parent }, { data: replies }] = await Promise.all([
    supabase.from("lento_room_messages").select(MESSAGE_COLS).eq("id", id).is("parent_id", null).maybeSingle(),
    supabase.from("lento_room_messages").select(MESSAGE_COLS).eq("parent_id", id).order("created_at", { ascending: true }).limit(300),
  ]);
  if (!parent) return null;
  const [p] = await decorate(supabase, [parent as unknown as MessageRow], viewer, true);
  const r = await decorate(supabase, (replies || []) as unknown as MessageRow[], viewer, false);
  const { data: follow } = await supabase
    .from("lento_room_follows")
    .select("message_id")
    .eq("message_id", id)
    .eq("member_id", viewer.id)
    .maybeSingle();
  return { message: p || null, replies: r.filter((m) => !m.deleted), following: !!follow };
}

async function underRateLimit(supabase: SupabaseClient, table: "lento_room_messages" | "lento_room_reactions", memberId: string, max: number) {
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from(table)
    .select("member_id", { count: "exact", head: true })
    .eq("member_id", memberId)
    .gte("created_at", since);
  return (count || 0) < max;
}

export type PostInput = {
  kind?: unknown;
  body?: unknown;
  parentId?: unknown;
  mood?: unknown;
  wants?: unknown;
};

export async function postMessage(
  supabase: SupabaseClient,
  author: MemberRow,
  input: PostInput
): Promise<{ ok: true; id: string } | { ok: false; status: number; error: string }> {
  if (!author.welcomed_at || !author.display_name) return { ok: false, status: 400, error: "Choose a display name first." };
  const parentId = typeof input.parentId === "string" ? input.parentId : null;
  const kind = parentId ? "message" : input.kind === "checkin" || input.kind === "question" ? input.kind : "message";
  const body = typeof input.body === "string" ? input.body.trim().slice(0, MAX_BODY) : "";
  const mood = kind === "checkin" && typeof input.mood === "string" && MOOD_IDS.has(input.mood) ? input.mood : null;
  const wants = kind === "question" && (input.wants === "sharing" || input.wants === "experiences") ? input.wants : null;

  if (kind === "checkin" && !mood) return { ok: false, status: 400, error: "Choose how you’re arriving." };
  if (kind !== "checkin" && !body) return { ok: false, status: 400, error: "Write something first." };
  if (!(await underRateLimit(supabase, "lento_room_messages", author.id, MAX_POSTS_PER_WINDOW))) {
    return { ok: false, status: 429, error: "You’ve posted a lot in a short time. Take a breath and try again in a few minutes." };
  }

  if (parentId) {
    const { data: parent } = await supabase
      .from("lento_room_messages")
      .select("id, parent_id, deleted_at, removed_at")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent || parent.parent_id || parent.removed_at) return { ok: false, status: 404, error: "That conversation isn’t available." };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("lento_room_messages")
    .insert({ member_id: author.id, kind, parent_id: parentId, body, mood, wants, created_at: now, last_activity_at: now })
    .select("id")
    .single();
  if (error || !data) return { ok: false, status: 500, error: "Couldn’t send. Please try again." };

  const threadId = parentId || data.id;
  await supabase.from("lento_room_follows").upsert({ message_id: threadId, member_id: author.id }, { onConflict: "message_id,member_id", ignoreDuplicates: true });
  if (parentId) await supabase.from("lento_room_messages").update({ last_activity_at: now }).eq("id", parentId);
  return { ok: true, id: data.id };
}

export async function editMessage(supabase: SupabaseClient, author: MemberRow, id: string, rawBody: unknown) {
  const body = typeof rawBody === "string" ? rawBody.trim().slice(0, MAX_BODY) : "";
  const { data: row } = await supabase
    .from("lento_room_messages")
    .select("id, member_id, kind, created_at, deleted_at, removed_at")
    .eq("id", id)
    .maybeSingle();
  if (!row || row.member_id !== author.id || row.deleted_at || row.removed_at) return { ok: false as const, status: 404, error: "Not found." };
  if (Date.now() - new Date(row.created_at).getTime() > EDIT_WINDOW_MS) {
    return { ok: false as const, status: 400, error: "Messages can be edited for 24 hours after posting." };
  }
  if (!body && row.kind !== "checkin") return { ok: false as const, status: 400, error: "Write something, or delete the message instead." };
  await supabase.from("lento_room_messages").update({ body, edited_at: new Date().toISOString() }).eq("id", id);
  return { ok: true as const };
}

export async function deleteMessage(supabase: SupabaseClient, author: MemberRow, id: string) {
  const { data: row } = await supabase.from("lento_room_messages").select("id, member_id").eq("id", id).maybeSingle();
  if (!row || row.member_id !== author.id) return { ok: false as const, status: 404, error: "Not found." };
  await supabase
    .from("lento_room_messages")
    .update({ deleted_at: new Date().toISOString(), body: "", mood: null })
    .eq("id", id);
  return { ok: true as const };
}

export async function toggleReaction(supabase: SupabaseClient, member: MemberRow, id: string, kind: unknown) {
  if (typeof kind !== "string" || !REACTION_IDS.has(kind)) return { ok: false as const, status: 400, error: "Unknown reaction." };
  if (!member.welcomed_at) return { ok: false as const, status: 400, error: "Choose a display name first." };
  const { data: existing } = await supabase
    .from("lento_room_reactions")
    .select("kind")
    .eq("message_id", id)
    .eq("member_id", member.id)
    .eq("kind", kind)
    .maybeSingle();
  if (existing) {
    await supabase.from("lento_room_reactions").delete().eq("message_id", id).eq("member_id", member.id).eq("kind", kind);
    return { ok: true as const, active: false };
  }
  if (!(await underRateLimit(supabase, "lento_room_reactions", member.id, MAX_REACTIONS_PER_WINDOW))) {
    return { ok: false as const, status: 429, error: "Slow down a little and try again in a few minutes." };
  }
  const { data: msg } = await supabase.from("lento_room_messages").select("id, removed_at, deleted_at").eq("id", id).maybeSingle();
  if (!msg || msg.removed_at || msg.deleted_at) return { ok: false as const, status: 404, error: "Not found." };
  await supabase.from("lento_room_reactions").insert({ message_id: id, member_id: member.id, kind });
  return { ok: true as const, active: true };
}

export async function setFollow(supabase: SupabaseClient, member: MemberRow, id: string, follow: boolean) {
  if (follow) {
    await supabase.from("lento_room_follows").upsert({ message_id: id, member_id: member.id }, { onConflict: "message_id,member_id", ignoreDuplicates: true });
  } else {
    await supabase.from("lento_room_follows").delete().eq("message_id", id).eq("member_id", member.id);
  }
}

export async function reportMessage(supabase: SupabaseClient, member: MemberRow, id: string, rawReason: unknown) {
  const reason = typeof rawReason === "string" ? rawReason.trim().slice(0, 1000) : "";
  const { data: msg } = await supabase.from("lento_room_messages").select("id").eq("id", id).maybeSingle();
  if (!msg) return { ok: false as const, status: 404, error: "Not found." };
  await supabase.from("lento_room_reports").insert({ message_id: id, reporter_id: member.id, reason });
  return { ok: true as const };
}

// ---------------------------------------------------------------- prompts

export async function ensurePromptsSeeded(supabase: SupabaseClient): Promise<void> {
  const { count } = await supabase.from("lento_room_prompts").select("id", { count: "exact", head: true }).not("seed_id", "is", null);
  if ((count || 0) >= SEED_PROMPTS.length) return;
  await supabase.from("lento_room_prompts").upsert(
    SEED_PROMPTS.map((p) => ({ seed_id: p.seedId, slot: p.slot, category: p.category, body: p.body })),
    { onConflict: "seed_id", ignoreDuplicates: true }
  );
}

export async function getSettings(supabase: SupabaseClient): Promise<{ paused: boolean; timezone: string; schedule: RoomSchedule }> {
  const { data } = await supabase.from("lento_room_settings").select("paused, timezone, schedule").eq("id", 1).maybeSingle();
  return {
    paused: !!data?.paused,
    timezone: data?.timezone || "America/Los_Angeles",
    schedule: normalizeSchedule(data?.schedule),
  };
}

/** Publishes a prompt into the room as its own message. */
export async function publishPrompt(
  supabase: SupabaseClient,
  promptId: string,
  slot: PromptSlot,
  scheduledFor: string | null
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const { data: prompt } = await supabase.from("lento_room_prompts").select("id, body, times_published").eq("id", promptId).maybeSingle();
  if (!prompt) return { ok: false, error: "Prompt not found." };

  // Claim the slot first: the unique index lets only one run publish it.
  const { data: pub, error: pubError } = await supabase
    .from("lento_room_publications")
    .insert({ prompt_id: promptId, slot, scheduled_for: scheduledFor, manual: scheduledFor === null })
    .select("id")
    .single();
  if (pubError || !pub) return { ok: false, error: "Already published." };

  const now = new Date().toISOString();
  const { data: msg, error } = await supabase
    .from("lento_room_messages")
    .insert({ member_id: null, kind: "prompt", body: prompt.body, prompt_id: promptId, prompt_slot: slot, created_at: now, last_activity_at: now })
    .select("id")
    .single();
  if (error || !msg) {
    await supabase.from("lento_room_publications").delete().eq("id", pub.id);
    return { ok: false, error: "Couldn’t publish." };
  }
  await Promise.all([
    supabase.from("lento_room_publications").update({ message_id: msg.id }).eq("id", pub.id),
    supabase
      .from("lento_room_prompts")
      .update({ times_published: (prompt.times_published || 0) + 1, last_published_at: now })
      .eq("id", promptId),
  ]);
  return { ok: true, messageId: msg.id };
}

/** Publishes any scheduled prompt that's due. Safe to call often and concurrently. */
export async function runPromptTick(supabase: SupabaseClient, now = new Date()): Promise<string[]> {
  const settings = await getSettings(supabase);
  if (settings.paused) return [];
  const due = dueSlots(now, settings.schedule, settings.timezone);
  if (due.length === 0) return [];

  const published: string[] = [];
  for (const { slot, scheduledFor } of due) {
    const { data: done } = await supabase
      .from("lento_room_publications")
      .select("id")
      .eq("slot", slot)
      .eq("scheduled_for", scheduledFor)
      .eq("manual", false)
      .maybeSingle();
    if (done) continue;
    await ensurePromptsSeeded(supabase);
    const [{ data: prompts }, { data: recent }] = await Promise.all([
      supabase.from("lento_room_prompts").select("id, slot, category, enabled, times_published, last_published_at").eq("slot", slot),
      supabase
        .from("lento_room_publications")
        .select("prompt:lento_room_prompts(category)")
        .eq("slot", slot)
        .order("published_at", { ascending: false })
        .limit(8),
    ]);
    const choice = pickPrompt(
      (prompts || []).map((p) => ({
        id: p.id,
        slot: p.slot,
        category: p.category,
        enabled: p.enabled,
        timesPublished: p.times_published,
        lastPublishedAt: p.last_published_at,
      })),
      slot,
      ((recent || []) as unknown as { prompt: { category: string } | null }[]).map((r) => r.prompt?.category || ""),
      scheduledFor
    );
    if (!choice) continue;
    const result = await publishPrompt(supabase, choice.id, slot, scheduledFor);
    if (result.ok) published.push(slot);
  }
  return published;
}

// ---------------------------------------------------------------- notifications (pulled by Lento)

/**
 * Counts only -- never message text -- per member with something new since
 * the last pull, then advances each member's marker. Lento matches members by
 * sha256(sub) and sends the emails itself; the room never learns addresses.
 */
export async function claimNotifications(supabase: SupabaseClient) {
  const cutoff = new Date().toISOString();
  const { data: members } = await supabase
    .from("lento_room_members")
    .select("id, sub_hash, notified_through, notify_replies, notify_followed, notify_topics, notify_digest")
    .eq("is_host", false)
    .is("restricted_at", null);
  const list = (members || []) as Array<{
    id: string;
    sub_hash: string;
    notified_through: string;
    notify_replies: boolean;
    notify_followed: boolean;
    notify_topics: boolean;
    notify_digest: boolean;
  }>;
  const wanting = list.filter((m) => m.notify_replies || m.notify_followed || m.notify_topics || m.notify_digest);
  if (wanting.length === 0) return { cutoff, members: [] };

  const oldest = wanting.reduce((a, m) => (m.notified_through < a ? m.notified_through : a), cutoff);
  const [{ data: messages }, { data: follows }] = await Promise.all([
    supabase
      .from("lento_room_messages")
      .select("id, member_id, parent_id, kind, created_at")
      .gt("created_at", oldest)
      .lte("created_at", cutoff)
      .is("deleted_at", null)
      .is("removed_at", null),
    supabase.from("lento_room_follows").select("message_id, member_id"),
  ]);
  const msgs = (messages || []) as Array<{ id: string; member_id: string | null; parent_id: string | null; kind: string; created_at: string }>;
  const parentIds = [...new Set(msgs.filter((m) => m.parent_id).map((m) => m.parent_id as string))];
  const { data: parents } = parentIds.length
    ? await supabase.from("lento_room_messages").select("id, member_id").in("id", parentIds)
    : { data: [] as { id: string; member_id: string | null }[] };
  const parentAuthor = new Map((parents || []).map((p) => [p.id, p.member_id]));
  const followed = new Map<string, Set<string>>();
  for (const f of (follows || []) as { message_id: string; member_id: string }[]) {
    if (!followed.has(f.member_id)) followed.set(f.member_id, new Set());
    followed.get(f.member_id)!.add(f.message_id);
  }

  const out = [];
  for (const m of wanting) {
    let replies = 0;
    let followedReplies = 0;
    let newTopics = 0;
    for (const x of msgs) {
      if (x.created_at <= m.notified_through || x.member_id === m.id) continue;
      if (x.kind === "prompt") {
        if (m.notify_topics) newTopics++;
      } else if (x.parent_id) {
        if (parentAuthor.get(x.parent_id) === m.id) {
          if (m.notify_replies) replies++;
        } else if (m.notify_followed && followed.get(m.id)?.has(x.parent_id)) {
          followedReplies++;
        }
      }
    }
    if (replies || followedReplies || newTopics || m.notify_digest) {
      out.push({ member: m.sub_hash, replies, followedReplies, newTopics, wantsDigest: m.notify_digest });
    }
  }
  await supabase
    .from("lento_room_members")
    .update({ notified_through: cutoff })
    .in(
      "id",
      wanting.map((m) => m.id)
    );
  return { cutoff, members: out };
}

export { SLOTS };
