// Production ExperienceStore on Supabase (service-role client only --
// every table in migration 104 is service_role-only). Server code only.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DispatchContext, ExperienceStore, PlanningSnapshot } from "./engine";
import { blockKey } from "./policy";
import type { WavePlan } from "./selection";
import {
  COUNTING_STATES,
  PENDING_STATES,
  RELEASED_STATES,
  type ExperienceSettings,
  type Invitation,
  type InvitationState,
  type Member,
  type MemberPreferences,
  type Question,
  type Topic,
  type Wave,
} from "./types";

const date = (v: string | null | undefined) => (v ? new Date(v) : null);

export function mapSettings(row: any): ExperienceSettings {
  return {
    enabled: !!row.enabled,
    paused: !!row.paused,
    launchedAt: date(row.launched_at),
    bootstrapEndsAt: date(row.bootstrap_ends_at),
    timezone: row.timezone,
    postBootstrapMode: row.post_bootstrap_mode,
    waveIntervalDays: row.wave_interval_days,
    staggerDays: row.stagger_days,
    perQuestionCap: row.per_question_cap,
    sendWindowStartHour: row.send_window_start_hour,
    sendWindowEndHour: row.send_window_end_hour,
    attributionDays: row.attribution_days,
    maxSendsPerRun: row.max_sends_per_run,
  };
}

export function mapQuestion(row: any): Question {
  const threads = [row.thread_post_id, ...(row.previous_thread_post_ids || [])].filter(Boolean);
  return {
    id: row.id,
    source: row.source,
    authorId: row.author_id,
    anonymous: !!row.anonymous,
    text: row.text,
    topic: row.topic,
    status: row.status,
    emailPermission: !!row.email_permission,
    emailReview: row.email_review,
    emailText: row.email_text,
    firstActivatedAt: date(row.first_activated_at),
    threadPostId: row.thread_post_id,
    threadPostIds: threads,
  };
}

function mapInvitation(row: any): Invitation {
  return {
    id: row.id,
    waveId: row.wave_id,
    userId: row.user_id,
    questionId: row.question_id,
    state: row.state,
    dueAt: new Date(row.due_at),
    windowEndsAt: new Date(row.window_ends_at),
    selectionReason: row.selection_reason,
    dropReason: row.drop_reason,
    attempts: row.attempts,
    claimedAt: date(row.claimed_at),
    sentAt: date(row.sent_at),
    providerMessageId: row.provider_message_id,
    needsReview: !!row.needs_review,
  };
}

const DEFAULT_PREFS: MemberPreferences = { optedOut: false, paused: false, topics: null, timezone: null };

function mapPrefs(row: any | undefined): MemberPreferences {
  if (!row) return DEFAULT_PREFS;
  return { optedOut: !!row.opted_out, paused: !!row.paused, topics: row.topics ?? null, timezone: row.timezone ?? null };
}

async function must<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return (data ?? ([] as unknown)) as T;
}

/** All auth users' email + verified flag (paged admin API). */
async function loadAuthUsers(supabase: SupabaseClient) {
  const byId = new Map<string, { email: string | null; verified: boolean }>();
  for (let page = 1; page < 100; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`auth users: ${error.message}`);
    for (const u of data.users) byId.set(u.id, { email: u.email || null, verified: !!u.email_confirmed_at });
    if (data.users.length < 1000) break;
  }
  return byId;
}

export async function loadMembers(supabase: SupabaseClient, onlyUserIds?: string[]): Promise<Member[]> {
  let profileQuery = supabase
    .from("profiles")
    .select("user_id, first_name, display_name, completed_onboarding, suspended, deactivated_at, notification_frequency, is_seeded")
    .eq("is_seeded", false)
    .not("user_id", "is", null);
  if (onlyUserIds) profileQuery = profileQuery.in("user_id", onlyUserIds);
  let prefsQuery = supabase.from("experience_preferences").select("*");
  if (onlyUserIds) prefsQuery = prefsQuery.in("user_id", onlyUserIds);

  const [profiles, prefs] = await Promise.all([must<any[]>(profileQuery, "profiles"), must<any[]>(prefsQuery, "preferences")]);
  const prefsById = new Map(prefs.map((p) => [p.user_id, p]));

  let auth: Map<string, { email: string | null; verified: boolean }>;
  if (onlyUserIds && onlyUserIds.length <= 20) {
    auth = new Map();
    for (const id of onlyUserIds) {
      const { data } = await supabase.auth.admin.getUserById(id);
      if (data?.user) auth.set(id, { email: data.user.email || null, verified: !!data.user.email_confirmed_at });
    }
  } else {
    auth = await loadAuthUsers(supabase);
  }

  return profiles
    .filter((p) => auth.has(p.user_id))
    .map((p) => {
      const a = auth.get(p.user_id)!;
      return {
        userId: p.user_id,
        firstName: p.first_name || (p.display_name ? String(p.display_name).split(" ")[0] : null),
        email: a.email,
        emailVerified: a.verified,
        completedOnboarding: !!p.completed_onboarding,
        suspended: !!p.suspended,
        deactivated: !!p.deactivated_at,
        notificationsOff: p.notification_frequency === "off",
        prefs: mapPrefs(prefsById.get(p.user_id)),
      };
    });
}

/** question id -> users who responded/replied in any of its threads; and top-level response counts. */
export async function loadThreadActivity(supabase: SupabaseClient, questions: Question[]) {
  const questionByPost = new Map<string, string>();
  for (const q of questions) for (const t of q.threadPostIds) questionByPost.set(t, q.id);
  const answeredBy = new Map<string, Set<string>>();
  const responseCounts = new Map<string, number>();
  const postIds = [...questionByPost.keys()];
  if (postIds.length === 0) return { answeredBy, responseCounts };

  const comments = await must<any[]>(
    supabase.from("comments").select("id, post_id, user_id, parent_comment_id").in("post_id", postIds).is("deleted_at", null),
    "comments"
  );
  // Follow-ups the anonymous author posted count for the real author.
  const anon = await must<any[]>(
    supabase.from("experience_anonymous_comments").select("comment_id, real_user_id").in("comment_id", comments.map((c) => c.id)),
    "anonymous comments"
  );
  const realUser = new Map(anon.map((a) => [a.comment_id, a.real_user_id]));

  for (const c of comments) {
    const qid = questionByPost.get(c.post_id)!;
    if (!answeredBy.has(qid)) answeredBy.set(qid, new Set());
    answeredBy.get(qid)!.add(realUser.get(c.id) || c.user_id);
    if (!c.parent_comment_id) responseCounts.set(qid, (responseCounts.get(qid) || 0) + 1);
  }
  return { answeredBy, responseCounts };
}

export async function loadOpenReportQuestionIds(supabase: SupabaseClient, questions: Question[]): Promise<Set<string>> {
  const questionByPost = new Map<string, string>();
  for (const q of questions) for (const t of q.threadPostIds) questionByPost.set(t, q.id);
  const postIds = [...questionByPost.keys()];
  const out = new Set<string>();
  if (postIds.length === 0) return out;
  const reports = await must<any[]>(
    supabase.from("reports").select("post_id, comment_id, status").in("post_id", postIds).eq("status", "open").is("comment_id", null),
    "reports"
  );
  for (const r of reports) out.add(questionByPost.get(r.post_id)!);
  return out;
}

export class SupabaseExperienceStore implements ExperienceStore {
  constructor(private supabase: SupabaseClient) {}

  newId(): string {
    return crypto.randomUUID();
  }

  async getSettings() {
    const row = await must<any>(this.supabase.from("experience_settings").select("*").eq("id", 1).single(), "settings");
    return mapSettings(row);
  }

  async getLatestWave(): Promise<Wave | null> {
    const { data } = await this.supabase.from("experience_waves").select("*").order("starts_at", { ascending: false }).limit(1).maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      startsAt: new Date(data.starts_at),
      windowEndsAt: new Date(data.window_ends_at),
      phase: data.phase,
      sourceMode: data.source_mode,
    };
  }

  async loadTopics(): Promise<Map<string, Topic>> {
    const rows = await must<any[]>(this.supabase.from("experience_topics").select("*").order("sort_order"), "topics");
    return new Map(rows.map((t) => [t.slug, { slug: t.slug, label: t.label, sensitive: !!t.sensitive }]));
  }

  async loadPlanningSnapshot(): Promise<PlanningSnapshot> {
    const [members, questionRows, topics, invitations, blocks, suppressions] = await Promise.all([
      loadMembers(this.supabase),
      must<any[]>(this.supabase.from("experience_questions").select("*"), "questions"),
      this.loadTopics(),
      must<any[]>(this.supabase.from("experience_invitations").select("user_id, question_id, state, sent_at, claimed_at"), "invitations"),
      must<any[]>(this.supabase.from("connection_blocks").select("blocker_id, blocked_id"), "blocks"),
      must<any[]>(this.supabase.from("email_suppressions").select("email"), "suppressions"),
    ]);
    const questions = questionRows.map(mapQuestion);
    const [{ answeredBy, responseCounts }, openReportQuestionIds] = await Promise.all([
      loadThreadActivity(this.supabase, questions),
      loadOpenReportQuestionIds(this.supabase, questions),
    ]);

    const sendHistory = new Map<string, Date[]>();
    const pendingMembers = new Set<string>();
    const invitedQuestions = new Map<string, Set<string>>();
    const invitationCounts = new Map<string, number>();
    for (const inv of invitations) {
      const state = inv.state as InvitationState;
      if (COUNTING_STATES.includes(state)) {
        const at = inv.sent_at || inv.claimed_at;
        if (at) sendHistory.set(inv.user_id, [...(sendHistory.get(inv.user_id) || []), new Date(at)]);
        invitationCounts.set(inv.question_id, (invitationCounts.get(inv.question_id) || 0) + 1);
      }
      if (PENDING_STATES.includes(state)) pendingMembers.add(inv.user_id);
      if (!RELEASED_STATES.includes(state)) {
        if (!invitedQuestions.has(inv.user_id)) invitedQuestions.set(inv.user_id, new Set());
        invitedQuestions.get(inv.user_id)!.add(inv.question_id);
      }
    }

    return {
      members,
      questions,
      topics,
      sendHistory,
      pendingMembers,
      responseCounts,
      invitationCounts,
      openReportQuestionIds,
      suppressedEmails: new Set(suppressions.map((s) => String(s.email).toLowerCase())),
      pair: {
        answeredBy,
        invitedQuestions,
        blockedPairs: new Set(blocks.map((b) => blockKey(b.blocker_id, b.blocked_id))),
        topics,
      },
    };
  }

  async createWave(wave: Wave, plan: WavePlan) {
    await must(
      this.supabase.from("experience_waves").insert({
        id: wave.id,
        starts_at: wave.startsAt.toISOString(),
        window_ends_at: wave.windowEndsAt.toISOString(),
        phase: wave.phase,
        source_mode: wave.sourceMode,
        summary: {
          eligibleQuestions: plan.eligibleQuestionIds.length,
          planned: plan.assignments.length,
          memberExclusions: plan.memberExclusions,
          questionExclusions: plan.questionExclusions,
        },
      }),
      "wave"
    );
    // One insert per assignment: a row that would break a ledger unique
    // rule (a race with another worker, or a stale snapshot) is skipped
    // on its own instead of failing the whole wave.
    let inserted = 0;
    let skipped = 0;
    for (const a of plan.assignments) {
      const { error } = await this.supabase.from("experience_invitations").insert({
        wave_id: wave.id,
        user_id: a.userId,
        question_id: a.questionId,
        due_at: a.dueAt.toISOString(),
        window_ends_at: a.windowEndsAt.toISOString(),
        selection_reason: a.reason,
      });
      if (!error) inserted += 1;
      else if (error.code === "23505") skipped += 1;
      else throw new Error(`invitation insert: ${error.message}`);
    }
    return { inserted, skipped };
  }

  async expireOverdue(now: Date) {
    const { data, error } = await this.supabase
      .from("experience_invitations")
      .update({ state: "expired", drop_reason: "delivery_window_passed", updated_at: now.toISOString() })
      .in("state", ["scheduled", "retry"])
      .lte("window_ends_at", now.toISOString())
      .select("id");
    if (error) throw new Error(`expire: ${error.message}`);
    return data?.length || 0;
  }

  async markStaleSendingUnknown(now: Date, olderThanMs: number) {
    const { data, error } = await this.supabase
      .from("experience_invitations")
      .update({
        state: "unknown",
        needs_review: true,
        last_error: "worker stopped mid-send; delivery unknown",
        updated_at: now.toISOString(),
      })
      .eq("state", "sending")
      .lt("claimed_at", new Date(now.getTime() - olderThanMs).toISOString())
      .select("id");
    if (error) throw new Error(`stale sending: ${error.message}`);
    return data?.length || 0;
  }

  async listDue(now: Date, limit: number) {
    const rows = await must<any[]>(
      this.supabase
        .from("experience_invitations")
        .select("*")
        .in("state", ["scheduled", "retry"])
        .lte("due_at", now.toISOString())
        .order("due_at")
        .limit(limit),
      "due invitations"
    );
    return rows.map(mapInvitation);
  }

  async loadDispatchContext(inv: Invitation): Promise<DispatchContext> {
    const [members, questionRow, topics, suppressions] = await Promise.all([
      loadMembers(this.supabase, [inv.userId]),
      this.supabase.from("experience_questions").select("*").eq("id", inv.questionId).maybeSingle(),
      this.loadTopics(),
      must<any[]>(this.supabase.from("email_suppressions").select("email"), "suppressions"),
    ]);
    const question = questionRow.data ? mapQuestion(questionRow.data) : null;
    const member = members[0] || null;

    let answered = false;
    let blocked = false;
    let questionHasOpenReport = false;
    if (question) {
      const [activity, reports] = await Promise.all([
        loadThreadActivity(this.supabase, [question]),
        loadOpenReportQuestionIds(this.supabase, [question]),
      ]);
      answered = !!activity.answeredBy.get(question.id)?.has(inv.userId);
      questionHasOpenReport = reports.has(question.id);
      if (question.authorId) {
        const { data } = await this.supabase
          .from("connection_blocks")
          .select("id")
          .or(
            `and(blocker_id.eq.${inv.userId},blocked_id.eq.${question.authorId}),and(blocker_id.eq.${question.authorId},blocked_id.eq.${inv.userId})`
          )
          .limit(1);
        blocked = !!data?.length;
      }
    }

    return {
      member,
      question,
      topics,
      answered,
      blocked,
      suppressedEmails: new Set(suppressions.map((s) => String(s.email).toLowerCase())),
      questionHasOpenReport,
    };
  }

  private async update(id: string, fromStates: InvitationState[], patch: Record<string, unknown>) {
    const { error } = await this.supabase
      .from("experience_invitations")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .in("state", fromStates);
    if (error) throw new Error(`invitation update: ${error.message}`);
  }

  async drop(id: string, reason: string) {
    await this.update(id, ["scheduled", "retry"], { state: "dropped", drop_reason: reason });
  }

  async expire(id: string) {
    await this.update(id, ["scheduled", "retry"], { state: "expired", drop_reason: "delivery_window_passed" });
  }

  async claim(id: string, now: Date) {
    const { data, error } = await this.supabase.rpc("experience_claim_invitation", {
      p_invitation_id: id,
      p_now: now.toISOString(),
    });
    if (error) throw new Error(`claim: ${error.message}`);
    return String(data);
  }

  async activateQuestion(questionId: string, now: Date) {
    const { data, error } = await this.supabase.rpc("experience_activate_question", {
      p_question_id: questionId,
      p_now: now.toISOString(),
    });
    if (error) throw new Error(error.message);
    return String(data);
  }

  async markSent(id: string, now: Date, providerMessageId: string | null) {
    await this.update(id, ["sending"], {
      state: "sent",
      sent_at: now.toISOString(),
      provider_message_id: providerMessageId,
      last_error: null,
    });
  }

  async markRetry(id: string, error: string, _now: Date, maxAttempts: number) {
    const { data } = await this.supabase.from("experience_invitations").select("attempts").eq("id", id).single();
    if ((data?.attempts || 0) >= maxAttempts) {
      await this.update(id, ["sending"], { state: "dropped", drop_reason: "delivery_failed", last_error: error.slice(0, 300) });
      return "dropped" as const;
    }
    await this.update(id, ["sending"], { state: "retry", last_error: error.slice(0, 300) });
    return "retry" as const;
  }

  async markUnknown(id: string, error: string) {
    await this.update(id, ["sending"], { state: "unknown", needs_review: true, last_error: error.slice(0, 300) });
  }
}
