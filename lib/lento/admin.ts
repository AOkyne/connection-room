// Lento Room administration (/app/admin/lento-room): aggregate overview,
// prompt bank and schedule, moderation, and privacy-conscious entry
// diagnostics. Admin-only (requireAdmin in the route). Never returns tokens,
// sub hashes or member ids beyond what an action needs.

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadPassKey } from "./pass";
import { roomSecret } from "./session";
import { ensurePromptsSeeded, getSettings, publishPrompt } from "./room";
import { normalizeSchedule, SLOTS } from "./schedule";
import { PROMPT_CATEGORIES, type PromptSlot } from "./prompt-seed";

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

export async function loadAdminOverview(supabase: SupabaseClient) {
  await ensurePromptsSeeded(supabase);
  const [
    settings,
    entered30,
    welcomed,
    { data: posters30 },
    conversations,
    messages7,
    { data: prompts },
    { data: publications },
    { data: reports },
    { data: restricted },
    { data: entries },
    { data: recent },
    passKey,
  ] = await Promise.all([
    getSettings(supabase),
    supabase.from("lento_room_members").select("id", { count: "exact", head: true }).eq("is_host", false).gte("last_entry_at", ago(30)),
    supabase.from("lento_room_members").select("id", { count: "exact", head: true }).eq("is_host", false).not("welcomed_at", "is", null),
    supabase.from("lento_room_messages").select("member_id").gte("created_at", ago(30)).not("member_id", "is", null),
    supabase.from("lento_room_messages").select("id", { count: "exact", head: true }).is("parent_id", null).neq("kind", "prompt").is("removed_at", null),
    supabase.from("lento_room_messages").select("id", { count: "exact", head: true }).gte("created_at", ago(7)).neq("kind", "prompt"),
    supabase.from("lento_room_prompts").select("id, slot, category, body, enabled, times_published, last_published_at").order("slot").order("created_at"),
    supabase
      .from("lento_room_publications")
      .select("id, slot, scheduled_for, manual, published_at, message_id, prompt:lento_room_prompts(body)")
      .order("published_at", { ascending: false })
      .limit(30),
    supabase
      .from("lento_room_reports")
      .select("id, reason, created_at, message:lento_room_messages!lento_room_reports_message_id_fkey(id, body, kind, removed_at, author:lento_room_members!lento_room_messages_member_id_fkey(id, display_name)), reporter:lento_room_members!lento_room_reports_reporter_id_fkey(display_name)")
      .is("resolved_at", null)
      .order("created_at", { ascending: true }),
    supabase.from("lento_room_members").select("id, display_name, restricted_at").not("restricted_at", "is", null),
    supabase.from("lento_room_entry_events").select("outcome").gte("created_at", ago(7)),
    supabase
      .from("lento_room_messages")
      .select("id, kind, parent_id, body, created_at, removed_at, deleted_at, author:lento_room_members!lento_room_messages_member_id_fkey(id, display_name, is_host)")
      .neq("kind", "prompt")
      .order("created_at", { ascending: false })
      .limit(20),
    loadPassKey(process.env.LENTO_PASS_PUBLIC_KEY),
  ]);

  // Replies per published prompt, for history and "unanswered".
  const promptMessageIds = (publications || []).map((p) => p.message_id).filter(Boolean) as string[];
  const { data: promptReplies } = promptMessageIds.length
    ? await supabase.from("lento_room_messages").select("parent_id").in("parent_id", promptMessageIds).is("removed_at", null).is("deleted_at", null)
    : { data: [] as { parent_id: string }[] };
  const replyCount = new Map<string, number>();
  for (const r of promptReplies || []) replyCount.set(r.parent_id, (replyCount.get(r.parent_id) || 0) + 1);

  const entryCounts: Record<string, number> = {};
  for (const e of entries || []) entryCounts[e.outcome] = (entryCounts[e.outcome] || 0) + 1;

  const history = (publications || []).map((p) => {
    const prompt = p.prompt as unknown as { body: string } | null;
    return {
      id: p.id,
      slot: p.slot,
      manual: p.manual,
      publishedAt: p.published_at,
      body: prompt?.body || "(prompt deleted)",
      replies: p.message_id ? replyCount.get(p.message_id) || 0 : 0,
    };
  });

  return {
    settings,
    overview: {
      enteredLast30Days: entered30.count || 0,
      membersWithName: welcomed.count || 0,
      activeParticipants30Days: new Set((posters30 || []).map((m) => m.member_id)).size,
      conversations: conversations.count || 0,
      messagesLast7Days: messages7.count || 0,
      unansweredPrompts: history.filter((h) => h.replies === 0).length,
      openReports: (reports || []).length,
    },
    prompts: (prompts || []).map((p) => ({
      id: p.id,
      slot: p.slot,
      category: p.category,
      body: p.body,
      enabled: p.enabled,
      timesPublished: p.times_published,
      lastPublishedAt: p.last_published_at,
    })),
    history,
    reports: (reports || []).map((r) => {
      const msg = r.message as unknown as { id: string; body: string; kind: string; removed_at: string | null; author: { id: string; display_name: string | null } | null } | null;
      const reporter = r.reporter as unknown as { display_name: string | null } | null;
      return {
        id: r.id,
        reason: r.reason,
        createdAt: r.created_at,
        messageId: msg?.id || null,
        messageBody: msg?.body || "",
        messageRemoved: !!msg?.removed_at,
        authorId: msg?.author?.id || null,
        authorName: msg?.author?.display_name || "A member",
        reporterName: reporter?.display_name || "A member",
      };
    }),
    recent: (recent || []).map((m) => {
      const author = m.author as unknown as { id: string; display_name: string | null; is_host: boolean } | null;
      return {
        id: m.id,
        kind: m.kind,
        isReply: !!m.parent_id,
        body: m.deleted_at ? "(deleted by its author)" : m.body,
        createdAt: m.created_at,
        removed: !!m.removed_at,
        authorId: author?.id || null,
        authorName: author?.display_name || "A member",
        isHost: !!author?.is_host,
      };
    }),
    restricted: (restricted || []).map((m) => ({ id: m.id, name: m.display_name || "A member", since: m.restricted_at })),
    diagnostics: {
      passKeyConfigured: !!passKey,
      sessionSecretConfigured: !!roomSecret(),
      notifySecretConfigured: !!process.env.LENTO_NOTIFY_SECRET,
      entriesLast7Days: entryCounts,
    },
    categories: PROMPT_CATEGORIES,
  };
}

type Action = Record<string, unknown>;

export async function runAdminAction(supabase: SupabaseClient, a: Action): Promise<{ ok: true } | { ok: false; error: string }> {
  const str = (v: unknown, max = 1000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const isSlot = (v: unknown): v is PromptSlot => typeof v === "string" && (SLOTS as string[]).includes(v);
  const now = new Date().toISOString();

  switch (a.action) {
    case "settings": {
      const update: Record<string, unknown> = { updated_at: now };
      if (typeof a.paused === "boolean") update.paused = a.paused;
      if (a.schedule) update.schedule = normalizeSchedule(a.schedule);
      await supabase.from("lento_room_settings").update(update).eq("id", 1);
      return { ok: true };
    }
    case "prompt_create": {
      const body = str(a.body);
      if (!body || !isSlot(a.slot)) return { ok: false, error: "Write the prompt and choose when it runs." };
      const category = (PROMPT_CATEGORIES as readonly string[]).includes(String(a.category)) ? String(a.category) : "intimacy-connection";
      await supabase.from("lento_room_prompts").insert({ slot: a.slot, category, body });
      return { ok: true };
    }
    case "prompt_update": {
      const id = str(a.id, 64);
      const update: Record<string, unknown> = { updated_at: now };
      if (typeof a.body === "string" && str(a.body)) update.body = str(a.body);
      if (typeof a.enabled === "boolean") update.enabled = a.enabled;
      if (isSlot(a.slot)) update.slot = a.slot;
      if ((PROMPT_CATEGORIES as readonly string[]).includes(String(a.category))) update.category = String(a.category);
      await supabase.from("lento_room_prompts").update(update).eq("id", id);
      return { ok: true };
    }
    case "publish_now": {
      const id = str(a.id, 64);
      const { data: prompt } = await supabase.from("lento_room_prompts").select("slot").eq("id", id).maybeSingle();
      if (!prompt) return { ok: false, error: "Prompt not found." };
      const r = await publishPrompt(supabase, id, prompt.slot as PromptSlot, null);
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    }
    case "remove_message": {
      await supabase.from("lento_room_messages").update({ removed_at: now }).eq("id", str(a.id, 64));
      if (a.reportId) await supabase.from("lento_room_reports").update({ resolved_at: now, resolution: "removed" }).eq("id", str(a.reportId, 64));
      return { ok: true };
    }
    case "restore_message": {
      await supabase.from("lento_room_messages").update({ removed_at: null }).eq("id", str(a.id, 64));
      return { ok: true };
    }
    case "restrict": {
      await supabase.from("lento_room_members").update({ restricted_at: now }).eq("id", str(a.memberId, 64)).eq("is_host", false);
      if (a.reportId) await supabase.from("lento_room_reports").update({ resolved_at: now, resolution: "restricted" }).eq("id", str(a.reportId, 64));
      return { ok: true };
    }
    case "unrestrict": {
      await supabase.from("lento_room_members").update({ restricted_at: null }).eq("id", str(a.memberId, 64));
      return { ok: true };
    }
    case "dismiss_report": {
      await supabase.from("lento_room_reports").update({ resolved_at: now, resolution: "dismissed" }).eq("id", str(a.reportId, 64));
      return { ok: true };
    }
    default:
      return { ok: false, error: "Unknown action" };
  }
}
