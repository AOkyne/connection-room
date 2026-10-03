// Wave planning: who gets which question, and when. Pure and
// deterministic for a given input -- the same function powers the real
// wave, the admin dry run and the simulation.
//
// Rules applied (see docs/your-experience-wanted.md):
// - only open, approved, email-eligible questions allowed by the current
//   source policy (bootstrap / recycle_and_member / member_only);
// - member questions before seeds; within a tier, spread the wave across
//   questions (fewest assigned this wave first), then prefer unanswered /
//   lightly answered, then questions that have had less attention;
// - at most `perQuestionCap` recipients per question per wave;
// - members ordered fairly: never invited first, then longest since their
//   last invitation (never "most active first");
// - one pending invitation per member; a member whose month cap / 30-day
//   gap wouldn't clear before the delivery window ends simply skips this
//   wave (normal);
// - due times spread across the window by a persisted, deterministic
//   member/wave offset, inside local send hours.

import {
  earliestAllowedSend,
  memberBlock,
  pairBlock,
  phaseAt,
  questionEmailBlock,
  sourcePolicyBlock,
  type PairContext,
} from "./policy";
import { DAY_MS, isValidTimeZone, zonedParts, zonedToUtc } from "./time";
import type { ExperienceSettings, Member, Phase, Question, Topic } from "./types";

export interface PlanningInput {
  now: Date;
  waveId: string;
  settings: ExperienceSettings;
  members: Member[];
  questions: Question[];
  topics: Map<string, Topic>;
  /** user id -> times of counting invitations (sent / unknown / sending) */
  sendHistory: Map<string, Date[]>;
  /** user ids holding a pending (scheduled/retry/sending) invitation */
  pendingMembers: Set<string>;
  /** question id -> number of top-level responses in its threads */
  responseCounts: Map<string, number>;
  /** question id -> invitations ever accepted for it (attention so far) */
  invitationCounts: Map<string, number>;
  openReportQuestionIds: Set<string>;
  suppressedEmails: Set<string>;
  pair: PairContext;
}

export interface PlannedAssignment {
  userId: string;
  questionId: string;
  dueAt: Date;
  windowEndsAt: Date;
  reason: string;
}

export interface WavePlan {
  phase: Phase;
  windowEndsAt: Date;
  eligibleQuestionIds: string[];
  assignments: PlannedAssignment[];
  /** reason -> number of members excluded for it (member-level reasons) */
  memberExclusions: Record<string, number>;
  /** reason -> number of questions excluded for it */
  questionExclusions: Record<string, number>;
  /** per excluded member, the reason (for the admin dry run) */
  memberExclusionDetail: Array<{ userId: string; reason: string }>;
}

/** FNV-1a 32-bit -- stable across runs and machines. */
export function stableHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function bump(record: Record<string, number>, key: string) {
  record[key] = (record[key] || 0) + 1;
}

/**
 * Deterministic due time for a member in a wave: a persisted day offset
 * and minute within local send hours, then moved later (never earlier) to
 * respect the wave start and the member's earliest allowed send. Returns
 * null if no slot fits before the window ends.
 */
export function dueTimeFor(
  userId: string,
  waveId: string,
  waveStart: Date,
  windowEnds: Date,
  earliest: Date | null,
  memberTimeZone: string | null,
  settings: Pick<ExperienceSettings, "timezone" | "staggerDays" | "sendWindowStartHour" | "sendWindowEndHour">
): Date | null {
  const tz = isValidTimeZone(memberTimeZone) ? memberTimeZone : settings.timezone;
  const minutesInWindow = (settings.sendWindowEndHour - settings.sendWindowStartHour) * 60;
  const h = stableHash(`${waveId}:${userId}`);
  const dayOffset = h % settings.staggerDays;
  const minuteOffset = Math.floor(h / settings.staggerDays) % minutesInWindow;

  const notBefore = Math.max(waveStart.getTime(), earliest?.getTime() ?? 0);
  const startLocal = zonedParts(waveStart, tz);
  // Try the member's own day first, then each later day in the window.
  for (let extra = 0; extra <= settings.staggerDays + 1; extra++) {
    const candidate = zonedToUtc(
      startLocal.year,
      startLocal.month,
      startLocal.day + dayOffset + extra,
      settings.sendWindowStartHour,
      minuteOffset,
      tz
    );
    if (candidate.getTime() >= windowEnds.getTime()) return null;
    if (candidate.getTime() >= notBefore) return candidate;
  }
  return null;
}

export function planWave(input: PlanningInput): WavePlan {
  const { now, settings } = input;
  const phase = phaseAt(now, settings);
  const windowEndsAt = new Date(now.getTime() + settings.staggerDays * DAY_MS);
  const memberExclusions: Record<string, number> = {};
  const questionExclusions: Record<string, number> = {};
  const memberExclusionDetail: Array<{ userId: string; reason: string }> = [];

  // 1. Questions this wave may use.
  const eligibleQuestions: Question[] = [];
  for (const q of input.questions) {
    const block = questionEmailBlock(q, input.openReportQuestionIds) || sourcePolicyBlock(q, now, settings);
    if (block) bump(questionExclusions, block);
    else eligibleQuestions.push(q);
  }

  const plan: WavePlan = {
    phase,
    windowEndsAt,
    eligibleQuestionIds: eligibleQuestions.map((q) => q.id),
    assignments: [],
    memberExclusions,
    questionExclusions,
    memberExclusionDetail,
  };
  if (eligibleQuestions.length === 0) return plan;

  // 2. Members, fairest first: never invited, then longest since last send.
  const lastSend = (userId: string) => {
    const h = input.sendHistory.get(userId);
    return h && h.length ? Math.max(...h.map((d) => d.getTime())) : null;
  };
  const candidates: Member[] = [];
  for (const m of input.members) {
    const block = memberBlock(m, input.suppressedEmails) || (input.pendingMembers.has(m.userId) ? "has_pending_invitation" : null);
    if (block) {
      bump(memberExclusions, block);
      memberExclusionDetail.push({ userId: m.userId, reason: block });
    } else {
      candidates.push(m);
    }
  }
  candidates.sort((a, b) => {
    const la = lastSend(a.userId);
    const lb = lastSend(b.userId);
    if (la === null && lb !== null) return -1;
    if (lb === null && la !== null) return 1;
    if (la !== null && lb !== null && la !== lb) return la - lb;
    return stableHash(`${input.waveId}:order:${a.userId}`) - stableHash(`${input.waveId}:order:${b.userId}`);
  });

  // 3. Assign.
  const assignedThisWave = new Map<string, number>();
  const tier = (q: Question) => (q.source === "member" ? 0 : 1);
  for (const m of candidates) {
    const earliest = earliestAllowedSend(input.sendHistory.get(m.userId) || [], settings.timezone);
    const dueAt = dueTimeFor(m.userId, input.waveId, now, windowEndsAt, earliest, m.prefs.timezone, settings);
    if (!dueAt) {
      const reason = "frequency_limit_until_after_window";
      bump(memberExclusions, reason);
      memberExclusionDetail.push({ userId: m.userId, reason });
      continue;
    }

    let best: Question | null = null;
    let bestKey: number[] = [];
    const pairReasons = new Set<string>();
    for (const q of eligibleQuestions) {
      if ((assignedThisWave.get(q.id) || 0) >= settings.perQuestionCap) {
        pairReasons.add("question_cap_reached");
        continue;
      }
      const block = pairBlock(m, q, input.pair);
      if (block) {
        pairReasons.add(block);
        continue;
      }
      const key = [
        tier(q),
        assignedThisWave.get(q.id) || 0,
        input.responseCounts.get(q.id) || 0,
        input.invitationCounts.get(q.id) || 0,
        stableHash(`${input.waveId}:${q.id}`),
      ];
      if (!best || compareKeys(key, bestKey) < 0) {
        best = q;
        bestKey = key;
      }
    }

    if (!best) {
      const reason = pairReasons.size === 1 ? `no_question:${[...pairReasons][0]}` : "no_suitable_question";
      bump(memberExclusions, reason);
      memberExclusionDetail.push({ userId: m.userId, reason });
      continue;
    }

    assignedThisWave.set(best.id, (assignedThisWave.get(best.id) || 0) + 1);
    plan.assignments.push({
      userId: m.userId,
      questionId: best.id,
      dueAt,
      windowEndsAt,
      reason: [
        best.source === "member" ? "member_question" : "community_prompt",
        lastSend(m.userId) === null ? "never_invited" : "longest_since_invited",
        (input.responseCounts.get(best.id) || 0) === 0 ? "unanswered" : "lightly_answered",
      ].join(","),
    });
  }

  return plan;
}

function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}
