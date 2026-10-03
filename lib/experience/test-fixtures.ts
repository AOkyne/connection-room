// Builders shared by the experience engine tests and the simulation.

import type { InvitationMailer, SendOutcome } from "./engine";
import { MemoryExperienceStore } from "./memory-store";
import type { ExperienceSettings, Member, Question, Topic } from "./types";
import { bootstrapEndFor } from "./time";

export const LA = "America/Los_Angeles";

export const TOPICS: Topic[] = [
  { slug: "loneliness", label: "Loneliness", sensitive: false },
  { slug: "friendship", label: "Friendship", sensitive: false },
  { slug: "belonging", label: "Belonging", sensitive: false },
  { slug: "dating", label: "Dating", sensitive: true },
  { slug: "affection", label: "Affection", sensitive: true },
];

export function makeSettings(launchedAt: Date, overrides: Partial<ExperienceSettings> = {}): ExperienceSettings {
  return {
    enabled: true,
    paused: false,
    launchedAt,
    bootstrapEndsAt: bootstrapEndFor(launchedAt, overrides.timezone || LA),
    timezone: LA,
    postBootstrapMode: "recycle_and_member",
    waveIntervalDays: 21,
    staggerDays: 7,
    perQuestionCap: 5,
    // Tests that aren't about wave size use no share limit.
    maxWaveSharePercent: 100,
    singleQuestionPerWave: false,
    sendWindowStartHour: 9,
    sendWindowEndHour: 18,
    attributionDays: 14,
    maxSendsPerRun: 1000,
    ...overrides,
  };
}

export function makeMember(userId: string, overrides: Partial<Member> = {}): Member {
  return {
    userId,
    firstName: userId,
    email: `${userId}@example.test`,
    emailVerified: true,
    completedOnboarding: true,
    suspended: false,
    deactivated: false,
    notificationsOff: false,
    prefs: { optedOut: false, paused: false, topics: null, timezone: null },
    ...overrides,
  };
}

export function makeSeed(id: string, topic = "friendship", overrides: Partial<Question> = {}): Question {
  return {
    id,
    source: "seed",
    authorId: null,
    anonymous: false,
    text: `Seed question ${id}?`,
    topic,
    status: "open",
    emailPermission: true,
    emailReview: "approved",
    emailText: `Seed question ${id}?`,
    firstActivatedAt: null,
    threadPostId: null,
    threadPostIds: [],
    ...overrides,
  };
}

export function makeMemberQuestion(id: string, authorId: string, topic = "friendship", overrides: Partial<Question> = {}): Question {
  return makeSeed(id, topic, {
    source: "member",
    authorId,
    anonymous: true,
    emailPermission: true,
    emailReview: "approved",
    threadPostId: `thread-${id}`,
    threadPostIds: [`thread-${id}`],
    ...overrides,
  });
}

export function makeStore(launchedAt: Date, opts: { members?: Member[]; questions?: Question[]; settings?: Partial<ExperienceSettings> } = {}) {
  const store = new MemoryExperienceStore(makeSettings(launchedAt, opts.settings));
  for (const t of TOPICS) store.topics.set(t.slug, t);
  for (const m of opts.members || []) store.members.set(m.userId, m);
  for (const q of opts.questions || []) store.questions.set(q.id, q);
  return store;
}

/** Records every accepted send; behavior per call is configurable. */
export class FakeMailer implements InvitationMailer {
  sent: Array<{ invitationId: string; userId: string; questionId: string; at: Date }> = [];
  next: Array<SendOutcome> = [];
  delayMs = 0;

  async send(args: Parameters<InvitationMailer["send"]>[0]): Promise<SendOutcome> {
    if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
    const outcome = this.next.shift() || { kind: "accepted", providerMessageId: `msg-${args.invitation.id}` };
    if (outcome.kind === "accepted") {
      this.sent.push({ invitationId: args.invitation.id, userId: args.member.userId, questionId: args.question.id, at: args.now });
    }
    return outcome;
  }
}

/** Runs `fn` every `stepHours` from `start` to `end` (inclusive of start). */
export async function everyHours(start: Date, end: Date, stepHours: number, fn: (now: Date) => Promise<void>) {
  for (let t = start.getTime(); t <= end.getTime(); t += stepHours * 3600_000) {
    await fn(new Date(t));
  }
}
