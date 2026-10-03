// Pure policy rules for "Your Experience Wanted". No I/O: everything takes
// data and a `now`, so the same rules drive wave planning, the dispatch-
// time recheck, the admin dry run, tests and the offline simulation.
//
// The database repeats the two frequency rules atomically
// (experience_claim_invitation, migration 104) because that's the one
// check that must hold even when two workers race.

import { DAY_MS, monthKey, startOfNextMonth } from "./time";
import type { ExperienceSettings, Member, Phase, Question, Topic } from "./types";

export const MIN_GAP_DAYS = 30;
export const MIN_GAP_MS = MIN_GAP_DAYS * DAY_MS;

// ---------------------------------------------------------------------
// Phase and source policy
// ---------------------------------------------------------------------

export function phaseAt(now: Date, settings: Pick<ExperienceSettings, "bootstrapEndsAt">): Phase {
  return settings.bootstrapEndsAt && now.getTime() < settings.bootstrapEndsAt.getTime() ? "bootstrap" : "post_bootstrap";
}

/**
 * Whether the question's SOURCE is allowed at `now`:
 * - bootstrap: approved seeds and eligible member questions;
 * - after bootstrap, recycle_and_member: member questions, plus seeds that
 *   were first activated DURING bootstrap (never a brand-new seed);
 * - after bootstrap, member_only: member questions only.
 */
export function sourcePolicyBlock(
  question: Pick<Question, "source" | "firstActivatedAt">,
  now: Date,
  settings: Pick<ExperienceSettings, "bootstrapEndsAt" | "postBootstrapMode">
): string | null {
  if (question.source === "member") return null;
  if (phaseAt(now, settings) === "bootstrap") return null;
  if (settings.postBootstrapMode === "member_only") return "seed_not_allowed_member_only";
  if (
    !question.firstActivatedAt ||
    !settings.bootstrapEndsAt ||
    question.firstActivatedAt.getTime() >= settings.bootstrapEndsAt.getTime()
  ) {
    return "seed_not_activated_during_bootstrap";
  }
  return null;
}

/** Whether a question may be emailed at all (independent of recipient). */
export function questionEmailBlock(question: Question, openReportQuestionIds: Set<string>): string | null {
  if (question.status !== "open") return `question_${question.status}`;
  if (question.emailReview !== "approved" || !question.emailText) return "question_not_approved_for_email";
  if (openReportQuestionIds.has(question.id)) return "question_has_open_report";
  if (question.source === "member") {
    if (!question.emailPermission) return "author_email_permission_off";
    if (!question.authorId) return "author_account_gone";
    if (!question.threadPostId) return "thread_removed";
  }
  return null;
}

// ---------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------

/** Whether a member may receive question invitations at all. */
export function memberBlock(member: Member, suppressedEmails: Set<string>): string | null {
  if (!member.email) return "no_email";
  if (!member.emailVerified) return "email_not_verified";
  if (member.suspended) return "account_suspended";
  if (member.deactivated) return "account_deactivated";
  if (!member.completedOnboarding) return "onboarding_incomplete";
  if (member.notificationsOff) return "notification_emails_off";
  if (member.prefs.optedOut) return "opted_out";
  if (member.prefs.paused) return "paused";
  if (suppressedEmails.has(member.email.trim().toLowerCase())) return "email_suppressed";
  return null;
}

/**
 * Topic consent: with no explicit choice, every non-sensitive topic is
 * allowed (the general fallback). Sensitive topics only by explicit choice.
 */
export function topicAllowed(prefs: Member["prefs"], topicSlug: string, topics: Map<string, Topic>): boolean {
  const topic = topics.get(topicSlug);
  if (!topic) return false;
  if (prefs.topics === null) return !topic.sensitive;
  return prefs.topics.includes(topicSlug);
}

export interface PairContext {
  /** question id -> user ids who have responded or replied in any of its threads */
  answeredBy: Map<string, Set<string>>;
  /** user id -> question ids they hold an unreleased invitation for */
  invitedQuestions: Map<string, Set<string>>;
  /** "a|b" for every block, either direction */
  blockedPairs: Set<string>;
  topics: Map<string, Topic>;
}

export function blockKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Whether this member may be invited to this question. */
export function pairBlock(member: Member, question: Question, ctx: PairContext): string | null {
  if (question.authorId === member.userId) return "is_author";
  if (ctx.answeredBy.get(question.id)?.has(member.userId)) return "already_answered";
  if (ctx.invitedQuestions.get(member.userId)?.has(question.id)) return "already_invited_to_question";
  if (!topicAllowed(member.prefs, question.topic, ctx.topics)) return "topic_not_selected";
  if (question.authorId && ctx.blockedPairs.has(blockKey(member.userId, question.authorId))) return "blocked";
  return null;
}

// ---------------------------------------------------------------------
// Frequency: one per calendar month (feature timezone) AND 30 full days
// ---------------------------------------------------------------------

/**
 * `history` = times of every invitation that counts (accepted, possibly
 * accepted, or being sent). Returns why a send at `now` isn't allowed.
 */
export function frequencyBlock(history: Date[], now: Date, timeZone: string): string | null {
  const nowMonth = monthKey(now, timeZone);
  let last = 0;
  for (const at of history) {
    if (monthKey(at, timeZone) === nowMonth) return "month_cap";
    last = Math.max(last, at.getTime());
  }
  if (last && now.getTime() < last + MIN_GAP_MS) return "cooldown_30_days";
  return null;
}

/** Earliest instant a member may be sent another invitation (null = any time). */
export function earliestAllowedSend(history: Date[], timeZone: string): Date | null {
  if (history.length === 0) return null;
  const last = new Date(Math.max(...history.map((d) => d.getTime())));
  const gap = last.getTime() + MIN_GAP_MS;
  const nextMonth = startOfNextMonth(last, timeZone).getTime();
  return new Date(Math.max(gap, nextMonth));
}
