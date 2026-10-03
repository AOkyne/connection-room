// The scheduled job for "Your Experience Wanted": one tick (run hourly by
// the external scheduler) does, in order:
//   1. expire invitations whose delivery window passed (no backlog bursts);
//   2. move invitations stuck in 'sending' (a crashed worker) to 'unknown'
//      for review -- never resent automatically;
//   3. if active and a wave is due, plan and record ONE wave (missed waves
//      are not caught up);
//   4. dispatch due invitations, re-checking every rule first.
//
// Storage and email are interfaces so the same orchestration runs against
// Supabase in production and an in-memory store in tests/simulation.

import {
  memberBlock,
  questionEmailBlock,
  sourcePolicyBlock,
  topicAllowed,
} from "./policy";
import { planWave, type PlannedAssignment, type PlanningInput, type WavePlan } from "./selection";
import { DAY_MS, isValidTimeZone, zonedParts } from "./time";
import type { ExperienceSettings, Invitation, Member, Question, Topic, Wave } from "./types";

export type PlanningSnapshot = Omit<PlanningInput, "now" | "waveId" | "settings">;

export interface DispatchContext {
  member: Member | null;
  question: Question | null;
  topics: Map<string, Topic>;
  /** member has responded/replied in any thread of the question */
  answered: boolean;
  /** member and question author have blocked each other (either way) */
  blocked: boolean;
  suppressedEmails: Set<string>;
  questionHasOpenReport: boolean;
}

export interface ExperienceStore {
  getSettings(): Promise<ExperienceSettings>;
  getLatestWave(): Promise<Wave | null>;
  loadPlanningSnapshot(): Promise<PlanningSnapshot>;
  /** Inserts the wave and its assignments; assignments that would violate
   * the ledger's unique rules are skipped, not forced. */
  createWave(wave: Wave, plan: WavePlan): Promise<{ inserted: number; skipped: number }>;
  expireOverdue(now: Date): Promise<number>;
  markStaleSendingUnknown(now: Date, olderThanMs: number): Promise<number>;
  listDue(now: Date, limit: number): Promise<Invitation[]>;
  loadDispatchContext(invitation: Invitation): Promise<DispatchContext>;
  drop(invitationId: string, reason: string, now: Date): Promise<void>;
  expire(invitationId: string, now: Date): Promise<void>;
  /** Atomic claim (see experience_claim_invitation): 'ok' or a reason. */
  claim(invitationId: string, now: Date): Promise<string>;
  /** Creates the question's thread on first real send; returns its post id. */
  activateQuestion(questionId: string, now: Date): Promise<string>;
  markSent(invitationId: string, now: Date, providerMessageId: string | null): Promise<void>;
  /** Definitive pre-acceptance failure: back to 'retry', or 'dropped' after the last attempt. */
  markRetry(invitationId: string, error: string, now: Date, maxAttempts: number): Promise<"retry" | "dropped">;
  /** The provider may or may not have accepted: counts toward limits, flagged for review. */
  markUnknown(invitationId: string, error: string, now: Date): Promise<void>;
  newId(): string;
}

export type SendOutcome =
  | { kind: "accepted"; providerMessageId: string | null }
  | { kind: "rejected"; error: string }
  | { kind: "ambiguous"; error: string };

export interface InvitationMailer {
  send(args: { invitation: Invitation; member: Member; question: Question; threadPostId: string; now: Date }): Promise<SendOutcome>;
}

export const MAX_SEND_ATTEMPTS = 3;
export const STALE_SENDING_MS = 15 * 60 * 1000;

export interface TickReport {
  status: "disabled" | "paused" | "ran";
  wave: { id: string; planned: number; inserted: number; skipped: number; plan: WavePlan } | null;
  expired: number;
  staleToUnknown: number;
  sent: number;
  retried: number;
  unknown: number;
  dropped: Record<string, number>;
}

/** Why a scheduled invitation may no longer be sent (null = still fine). */
export function dispatchBlock(invitation: Invitation, ctx: DispatchContext, now: Date, settings: ExperienceSettings): string | null {
  if (!ctx.member) return "account_deleted";
  const memberReason = memberBlock(ctx.member, ctx.suppressedEmails);
  if (memberReason) return memberReason;
  if (!ctx.question) return "question_deleted";
  const openReports = ctx.questionHasOpenReport ? new Set([ctx.question.id]) : new Set<string>();
  const questionReason = questionEmailBlock(ctx.question, openReports);
  if (questionReason) return questionReason;
  // The source policy is checked at SEND time too, so an invitation planned
  // during bootstrap but due after it follows the post-bootstrap rules.
  const sourceReason = sourcePolicyBlock(ctx.question, now, settings);
  if (sourceReason) return sourceReason;
  if (ctx.question.authorId === invitation.userId) return "is_author";
  if (ctx.answered) return "already_answered";
  if (ctx.blocked) return "blocked";
  if (!topicAllowed(ctx.member.prefs, ctx.question.topic, ctx.topics)) return "topic_not_selected";
  return null;
}

/**
 * Local send hours for this member (their timezone if known and valid,
 * otherwise the feature timezone). One hour of grace after the end hour,
 * so a slot due at 17:40 still goes out on an hourly 18:00 tick; anything
 * later (e.g. a retry after a failure, or after an outage) waits for the
 * next morning instead of arriving at night.
 */
export function withinSendHours(now: Date, memberTimeZone: string | null, settings: ExperienceSettings): boolean {
  const tz = isValidTimeZone(memberTimeZone) ? memberTimeZone : settings.timezone;
  const hour = zonedParts(now, tz).hour;
  return hour >= settings.sendWindowStartHour && hour <= settings.sendWindowEndHour;
}

export function waveIsDue(latest: Wave | null, now: Date, settings: ExperienceSettings): boolean {
  if (!latest) return true;
  return now.getTime() >= latest.startsAt.getTime() + settings.waveIntervalDays * DAY_MS;
}

export async function planWaveNow(store: ExperienceStore, now: Date, waveId: string): Promise<WavePlan> {
  const settings = await store.getSettings();
  const snapshot = await store.loadPlanningSnapshot();
  return planWave({ ...snapshot, now, waveId, settings });
}

export async function runExperienceTick(store: ExperienceStore, mailer: InvitationMailer, now: Date): Promise<TickReport> {
  const report: TickReport = {
    status: "ran",
    wave: null,
    expired: 0,
    staleToUnknown: 0,
    sent: 0,
    retried: 0,
    unknown: 0,
    dropped: {},
  };
  const settings = await store.getSettings();
  if (!settings.enabled || !settings.launchedAt) {
    report.status = "disabled";
    return report;
  }

  report.expired = await store.expireOverdue(now);
  report.staleToUnknown = await store.markStaleSendingUnknown(now, STALE_SENDING_MS);

  if (settings.paused) {
    report.status = "paused";
    return report;
  }

  // One wave at most per tick, and never a catch-up of missed waves: the
  // next wave starts now, measured from the latest wave's start.
  if (waveIsDue(await store.getLatestWave(), now, settings)) {
    const waveId = store.newId();
    const plan = await planWaveNow(store, now, waveId);
    const wave: Wave = {
      id: waveId,
      startsAt: now,
      windowEndsAt: plan.windowEndsAt,
      phase: plan.phase,
      sourceMode: plan.phase === "bootstrap" ? "bootstrap" : settings.postBootstrapMode,
    };
    const result = await store.createWave(wave, plan);
    report.wave = { id: waveId, planned: plan.assignments.length, ...result, plan };
  }

  const due = await store.listDue(now, settings.maxSendsPerRun);
  for (const invitation of due) {
    if (now.getTime() >= invitation.windowEndsAt.getTime()) {
      await store.expire(invitation.id, now);
      report.expired += 1;
      continue;
    }

    const ctx = await store.loadDispatchContext(invitation);
    const reason = dispatchBlock(invitation, ctx, now, settings);
    if (reason) {
      await store.drop(invitation.id, reason, now);
      report.dropped[reason] = (report.dropped[reason] || 0) + 1;
      continue;
    }

    if (!withinSendHours(now, ctx.member!.prefs.timezone, settings)) continue;

    const claim = await store.claim(invitation.id, now);
    if (claim === "feature_paused") break;
    if (claim === "window_passed") {
      await store.expire(invitation.id, now);
      report.expired += 1;
      continue;
    }
    if (claim === "month_cap" || claim === "cooldown_30_days") {
      // No replacement send: the member just skips this wave.
      await store.drop(invitation.id, claim, now);
      report.dropped[claim] = (report.dropped[claim] || 0) + 1;
      continue;
    }
    if (claim !== "ok") continue; // not_due / not_pending: another worker has it

    let threadPostId: string;
    try {
      threadPostId = await store.activateQuestion(invitation.questionId, now);
    } catch (err) {
      const outcome = await store.markRetry(invitation.id, `activation: ${errorText(err)}`, now, MAX_SEND_ATTEMPTS);
      if (outcome === "retry") report.retried += 1;
      else report.dropped.delivery_failed = (report.dropped.delivery_failed || 0) + 1;
      continue;
    }

    const outcome = await mailer.send({
      invitation,
      member: ctx.member!,
      question: ctx.question!,
      threadPostId,
      now,
    });
    if (outcome.kind === "accepted") {
      await store.markSent(invitation.id, now, outcome.providerMessageId);
      report.sent += 1;
    } else if (outcome.kind === "rejected") {
      const r = await store.markRetry(invitation.id, outcome.error, now, MAX_SEND_ATTEMPTS);
      if (r === "retry") report.retried += 1;
      else report.dropped.delivery_failed = (report.dropped.delivery_failed || 0) + 1;
    } else {
      await store.markUnknown(invitation.id, outcome.error, now);
      report.unknown += 1;
    }
  }

  return report;
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export type { PlannedAssignment };
