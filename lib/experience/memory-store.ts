// In-memory ExperienceStore for tests and the offline simulation. It
// enforces the same rules as migration 104 -- the two partial unique
// indexes and the claim function's month/30-day checks -- so the engine
// is exercised against the same guarantees it gets from Postgres.

import type { DispatchContext, ExperienceStore, PlanningSnapshot } from "./engine";
import { blockKey, frequencyBlock } from "./policy";
import type { WavePlan } from "./selection";
import {
  COUNTING_STATES,
  PENDING_STATES,
  RELEASED_STATES,
  type ExperienceSettings,
  type Invitation,
  type Member,
  type Question,
  type Topic,
  type Wave,
} from "./types";

export class MemoryExperienceStore implements ExperienceStore {
  settings: ExperienceSettings;
  members = new Map<string, Member>();
  questions = new Map<string, Question>();
  topics = new Map<string, Topic>();
  invitations: Invitation[] = [];
  waves: Wave[] = [];
  /** question id -> user ids who responded */
  answeredBy = new Map<string, Set<string>>();
  responseCounts = new Map<string, number>();
  blockedPairs = new Set<string>();
  suppressedEmails = new Set<string>();
  openReportQuestionIds = new Set<string>();
  threadsCreated = 0;
  private seq = 0;

  constructor(settings: ExperienceSettings) {
    this.settings = settings;
  }

  newId(): string {
    this.seq += 1;
    return `id-${this.seq}`;
  }

  // ---- helpers for tests ------------------------------------------------

  addAnswer(questionId: string, userId: string) {
    if (!this.answeredBy.has(questionId)) this.answeredBy.set(questionId, new Set());
    this.answeredBy.get(questionId)!.add(userId);
    this.responseCounts.set(questionId, (this.responseCounts.get(questionId) || 0) + 1);
  }

  block(a: string, b: string) {
    this.blockedPairs.add(blockKey(a, b));
  }

  /** Mirrors the partial unique indexes; returns why an insert would fail. */
  private constraintViolation(inv: Pick<Invitation, "userId" | "questionId">): string | null {
    for (const other of this.invitations) {
      if (other.userId !== inv.userId) continue;
      if (other.questionId === inv.questionId && !RELEASED_STATES.includes(other.state)) return "member_question_unique";
      if (PENDING_STATES.includes(other.state)) return "one_pending_unique";
    }
    return null;
  }

  /** Public for tests that try to insert directly (e.g. a manual admin path). */
  insertInvitation(inv: Invitation): boolean {
    if (this.constraintViolation(inv)) return false;
    this.invitations.push(inv);
    return true;
  }

  countingHistory(userId: string, excludeId?: string): Date[] {
    return this.invitations
      .filter((i) => i.userId === userId && i.id !== excludeId && COUNTING_STATES.includes(i.state))
      .map((i) => (i.sentAt || i.claimedAt)!)
      .filter(Boolean);
  }

  // ---- ExperienceStore --------------------------------------------------

  async getSettings() {
    return this.settings;
  }

  async getLatestWave() {
    return this.waves.length ? this.waves[this.waves.length - 1] : null;
  }

  async loadPlanningSnapshot(): Promise<PlanningSnapshot> {
    const sendHistory = new Map<string, Date[]>();
    const pendingMembers = new Set<string>();
    const invitedQuestions = new Map<string, Set<string>>();
    const invitationCounts = new Map<string, number>();
    for (const inv of this.invitations) {
      if (COUNTING_STATES.includes(inv.state)) {
        const at = inv.sentAt || inv.claimedAt;
        if (at) sendHistory.set(inv.userId, [...(sendHistory.get(inv.userId) || []), at]);
        invitationCounts.set(inv.questionId, (invitationCounts.get(inv.questionId) || 0) + 1);
      }
      if (PENDING_STATES.includes(inv.state)) pendingMembers.add(inv.userId);
      if (!RELEASED_STATES.includes(inv.state)) {
        if (!invitedQuestions.has(inv.userId)) invitedQuestions.set(inv.userId, new Set());
        invitedQuestions.get(inv.userId)!.add(inv.questionId);
      }
    }
    return {
      members: [...this.members.values()],
      questions: [...this.questions.values()],
      topics: this.topics,
      sendHistory,
      pendingMembers,
      responseCounts: this.responseCounts,
      invitationCounts,
      openReportQuestionIds: this.openReportQuestionIds,
      suppressedEmails: this.suppressedEmails,
      pair: { answeredBy: this.answeredBy, invitedQuestions, blockedPairs: this.blockedPairs, topics: this.topics },
    };
  }

  async createWave(wave: Wave, plan: WavePlan) {
    this.waves.push(wave);
    let inserted = 0;
    let skipped = 0;
    for (const a of plan.assignments) {
      const ok = this.insertInvitation({
        id: this.newId(),
        waveId: wave.id,
        userId: a.userId,
        questionId: a.questionId,
        state: "scheduled",
        dueAt: a.dueAt,
        windowEndsAt: a.windowEndsAt,
        selectionReason: a.reason,
        dropReason: null,
        attempts: 0,
        claimedAt: null,
        sentAt: null,
        providerMessageId: null,
        needsReview: false,
      });
      if (ok) inserted += 1;
      else skipped += 1;
    }
    return { inserted, skipped };
  }

  async expireOverdue(now: Date) {
    let n = 0;
    for (const inv of this.invitations) {
      if ((inv.state === "scheduled" || inv.state === "retry") && now.getTime() >= inv.windowEndsAt.getTime()) {
        inv.state = "expired";
        inv.dropReason = "delivery_window_passed";
        n += 1;
      }
    }
    return n;
  }

  async markStaleSendingUnknown(now: Date, olderThanMs: number) {
    let n = 0;
    for (const inv of this.invitations) {
      if (inv.state === "sending" && inv.claimedAt && now.getTime() - inv.claimedAt.getTime() > olderThanMs) {
        inv.state = "unknown";
        inv.needsReview = true;
        n += 1;
      }
    }
    return n;
  }

  async listDue(now: Date, limit: number) {
    return this.invitations
      .filter((i) => (i.state === "scheduled" || i.state === "retry") && i.dueAt.getTime() <= now.getTime())
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
      .slice(0, limit)
      .map((i) => ({ ...i }));
  }

  async loadDispatchContext(inv: Invitation): Promise<DispatchContext> {
    const question = this.questions.get(inv.questionId) || null;
    return {
      member: this.members.get(inv.userId) || null,
      question,
      topics: this.topics,
      answered: !!this.answeredBy.get(inv.questionId)?.has(inv.userId),
      blocked: !!(question?.authorId && this.blockedPairs.has(blockKey(inv.userId, question.authorId))),
      suppressedEmails: this.suppressedEmails,
      questionHasOpenReport: this.openReportQuestionIds.has(inv.questionId),
    };
  }

  private find(id: string) {
    const inv = this.invitations.find((i) => i.id === id);
    if (!inv) throw new Error(`invitation ${id} not found`);
    return inv;
  }

  async drop(id: string, reason: string) {
    const inv = this.find(id);
    if (inv.state === "scheduled" || inv.state === "retry") {
      inv.state = "dropped";
      inv.dropReason = reason;
    }
  }

  async expire(id: string) {
    const inv = this.find(id);
    if (inv.state === "scheduled" || inv.state === "retry") {
      inv.state = "expired";
      inv.dropReason = "delivery_window_passed";
    }
  }

  /** Same checks, same order as experience_claim_invitation (migration 104). */
  async claim(id: string, now: Date): Promise<string> {
    if (!this.settings.enabled || this.settings.paused) return "feature_paused";
    const inv = this.invitations.find((i) => i.id === id);
    if (!inv) return "not_found";
    if (inv.state !== "scheduled" && inv.state !== "retry") return "not_pending";
    if (now.getTime() < inv.dueAt.getTime()) return "not_due";
    if (now.getTime() >= inv.windowEndsAt.getTime()) return "window_passed";
    const block = frequencyBlock(this.countingHistory(inv.userId, inv.id), now, this.settings.timezone);
    if (block) return block;
    inv.state = "sending";
    inv.claimedAt = now;
    inv.attempts += 1;
    return "ok";
  }

  async activateQuestion(questionId: string, now: Date) {
    const q = this.questions.get(questionId);
    if (!q) throw new Error("question not found");
    if (!q.threadPostId) {
      q.threadPostId = `thread-${questionId}`;
      q.threadPostIds = [...q.threadPostIds, q.threadPostId];
      this.threadsCreated += 1;
    }
    if (!q.firstActivatedAt) q.firstActivatedAt = now;
    return q.threadPostId;
  }

  async markSent(id: string, now: Date, providerMessageId: string | null) {
    const inv = this.find(id);
    if (inv.state !== "sending") return;
    inv.state = "sent";
    inv.sentAt = now;
    inv.providerMessageId = providerMessageId;
  }

  async markRetry(id: string, _error: string, _now: Date, maxAttempts: number) {
    const inv = this.find(id);
    if (inv.state !== "sending") return "retry" as const;
    if (inv.attempts >= maxAttempts) {
      inv.state = "dropped";
      inv.dropReason = "delivery_failed";
      return "dropped" as const;
    }
    inv.state = "retry";
    return "retry" as const;
  }

  async markUnknown(id: string) {
    const inv = this.find(id);
    if (inv.state !== "sending") return;
    inv.state = "unknown";
    inv.needsReview = true;
  }
}
