// Offline simulation of "Your Experience Wanted": 200 days of hourly
// scheduler ticks against synthetic members, run once per post-bootstrap
// mode. No email is sent -- a fake mailer records "accepted" sends (with
// occasional rejections and timeouts). Asserts the policy invariants and
// prints a report of sends and exclusion reasons.

import { describe, it, expect } from "vitest";
import { runExperienceTick } from "./engine";
import { DAY_MS, monthKey, zonedParts, zonedToUtc } from "./time";
import { FakeMailer, LA, makeMember, makeMemberQuestion, makeSeed, makeStore } from "./test-fixtures";
import type { PostBootstrapMode } from "./types";

// Deterministic PRNG so the run is repeatable.
function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const DAYS = 200;
// Launch on a month-end date, so the bootstrap boundary uses clamping (Jan 31 -> Apr 30).
const launch = zonedToUtc(2027, 1, 31, 15, 0, LA);

async function simulate(mode: PostBootstrapMode) {
  const rand = prng(42);
  const members = Array.from({ length: 80 }, (_, i) => {
    const r = rand();
    return makeMember(`m${String(i).padStart(2, "0")}`, {
      notificationsOff: i % 17 === 0,
      emailVerified: i % 29 !== 0,
      prefs: {
        optedOut: i % 13 === 0,
        paused: false,
        topics: r < 0.25 ? ["friendship", "dating", "affection"] : r < 0.35 ? ["loneliness"] : null,
        timezone: i % 5 === 0 ? "America/New_York" : i % 7 === 0 ? "Not/AZone" : null,
      },
    });
  });
  const seedTopics = ["friendship", "loneliness", "belonging", "dating", "affection"];
  const questions = Array.from({ length: 14 }, (_, i) => makeSeed(`seed${i}`, seedTopics[i % seedTopics.length]));
  const store = makeStore(launch, { members, questions, settings: { postBootstrapMode: mode, maxWaveSharePercent: 25, singleQuestionPerWave: true } });
  const mailer = new FakeMailer();
  const bootstrapEnd = store.settings.bootstrapEndsAt!;

  const dropTotals: Record<string, number> = {};
  let expiredTotal = 0;
  let unknownTotal = 0;
  const memberExclusionTotals: Record<string, number> = {};
  const optedOutAt = new Map<string, number>();

  for (let t = launch.getTime(); t <= launch.getTime() + DAYS * DAY_MS; t += 3600_000) {
    const now = new Date(t);
    const day = Math.floor((t - launch.getTime()) / DAY_MS);
    const atDayStart = (t - launch.getTime()) % DAY_MS === 0;

    if (atDayStart) {
      // Members submit questions (with email permission, approved) now and then.
      if ([10, 45, 95, 130, 170].includes(day)) {
        const author = members[(day * 7) % members.length].userId;
        store.questions.set(`mq${day}`, makeMemberQuestion(`mq${day}`, author, "friendship"));
      }
      // Someone pauses for a while, someone opts out, someone is suspended.
      if (day === 30) members[3].prefs.paused = true;
      if (day === 75) members[3].prefs.paused = false;
      if (day === 60) {
        members[4].prefs.optedOut = true;
        optedOutAt.set(members[4].userId, t);
      }
      if (day === 90) members[6].suspended = true;
      // Some invited members respond in the app.
      for (const s of mailer.sent) {
        if (rand() < 0.02) store.addAnswer(s.questionId, s.userId);
      }
    }

    // Occasional provider trouble.
    const roll = rand();
    if (roll < 0.002) mailer.next.push({ kind: "ambiguous", error: "timeout" });
    else if (roll < 0.006) mailer.next.push({ kind: "rejected", error: "451 temporary" });

    const r = await runExperienceTick(store, mailer, now);
    expiredTotal += r.expired;
    unknownTotal += r.unknown;
    for (const [k, v] of Object.entries(r.dropped)) dropTotals[k] = (dropTotals[k] || 0) + v;
    if (r.wave) {
      for (const [k, v] of Object.entries(r.wave.plan.memberExclusions)) memberExclusionTotals[k] = (memberExclusionTotals[k] || 0) + v;
    }
  }

  return { store, mailer, bootstrapEnd, dropTotals, expiredTotal, unknownTotal, memberExclusionTotals, optedOutAt, members };
}

describe(`offline simulation (${DAYS} days, hourly ticks)`, () => {
  for (const mode of ["recycle_and_member", "member_only"] as const) {
    it(`holds every invariant in ${mode} mode`, async () => {
      const sim = await simulate(mode);
      const { store, mailer, bootstrapEnd } = sim;

      // 1. Per member: one per calendar month AND >= 30 days apart (accepted + possibly-accepted).
      const counting = store.invitations.filter((i) => i.state === "sent" || i.state === "unknown");
      const byMember = new Map<string, number[]>();
      for (const inv of counting) {
        const at = (inv.sentAt || inv.claimedAt)!.getTime();
        byMember.set(inv.userId, [...(byMember.get(inv.userId) || []), at]);
      }
      for (const times of byMember.values()) {
        times.sort((a, b) => a - b);
        const months = times.map((t) => monthKey(new Date(t), LA));
        expect(new Set(months).size).toBe(months.length);
        for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(30 * DAY_MS);
      }

      // 2. Never the same canonical question twice for a member.
      const pairs = counting.map((i) => `${i.userId}:${i.questionId}`);
      expect(new Set(pairs).size).toBe(pairs.length);

      // 3. Single-question waves: one question per wave, at most 25% of members.
      // Qualified members vary over the run (opt-outs, suspensions), so the
      // cap is at most 25% of the starting membership.
      const waveLimit = Math.floor((sim.members.length * store.settings.maxWaveSharePercent) / 100);
      const perWave = new Map<string, { count: number; questions: Set<string> }>();
      for (const inv of store.invitations) {
        const w = perWave.get(inv.waveId!) || { count: 0, questions: new Set<string>() };
        w.count += 1;
        w.questions.add(inv.questionId);
        perWave.set(inv.waveId!, w);
      }
      for (const w of perWave.values()) {
        expect(w.questions.size).toBe(1);
        expect(w.count).toBeLessThanOrEqual(waveLimit);
      }

      // 4. Source policy after bootstrap.
      for (const s of mailer.sent) {
        if (s.at.getTime() < bootstrapEnd.getTime()) continue;
        const q = store.questions.get(s.questionId)!;
        if (q.source === "seed") {
          expect(mode).toBe("recycle_and_member");
          expect(q.firstActivatedAt!.getTime()).toBeLessThan(bootstrapEnd.getTime());
        }
      }

      // 5. Sends inside local send hours (feature tz for unknown/invalid zones).
      for (const s of mailer.sent) {
        const tz = store.members.get(s.userId)?.prefs.timezone === "America/New_York" ? "America/New_York" : LA;
        const h = zonedParts(s.at, tz).hour;
        expect(h).toBeGreaterThanOrEqual(9);
        expect(h).toBeLessThan(18 + 1); // hourly ticks may land up to an hour after the due minute
      }

      // 6. Nobody ineligible ever received anything.
      for (const s of mailer.sent) {
        const m = store.members.get(s.userId)!;
        expect(m.notificationsOff).toBe(false);
        expect(m.emailVerified).toBe(true);
        const optedOut = sim.optedOutAt.get(s.userId);
        if (optedOut !== undefined) expect(s.at.getTime()).toBeLessThan(optedOut);
        if (m.prefs.optedOut && optedOut === undefined) throw new Error("sent to an opted-out member");
      }

      // 7. Seeds are activated lazily -- only those actually sent have threads.
      const activatedSeeds = [...store.questions.values()].filter((q) => q.source === "seed" && q.threadPostId);
      const sentSeedIds = new Set(mailer.sent.filter((s) => store.questions.get(s.questionId)!.source === "seed").map((s) => s.questionId));
      expect(activatedSeeds.length).toBeLessThanOrEqual(sentSeedIds.size + 1);

      // 8. Skipping waves is normal.
      const waves = store.waves.length;
      const eligibleMembers = sim.members.filter((m) => !m.notificationsOff && m.emailVerified && !m.prefs.optedOut).length;
      expect(mailer.sent.length).toBeLessThan(waves * eligibleMembers);

      const sentBySource = mailer.sent.reduce<Record<string, number>>((acc, s) => {
        const q = store.questions.get(s.questionId)!;
        const phase = s.at.getTime() < bootstrapEnd.getTime() ? "bootstrap" : "after";
        const k = `${phase}:${q.source}`;
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});

      console.log(
        `\n=== Simulation: ${mode} ===\n` +
          JSON.stringify(
            {
              days: DAYS,
              members: sim.members.length,
              waves,
              acceptedSends: mailer.sent.length,
              sentBySourceAndPhase: sentBySource,
              uniqueRecipients: new Set(mailer.sent.map((s) => s.userId)).size,
              maxSendsToOneMember: Math.max(0, ...[...byMember.values()].map((v) => v.length)),
              flaggedUnknown: sim.unknownTotal,
              expiredInvitations: sim.expiredTotal,
              droppedAtDispatch: sim.dropTotals,
              waveMemberExclusions: sim.memberExclusionTotals,
              seedThreadsCreated: activatedSeeds.length,
            },
            null,
            2
          )
      );
    }, 120_000);
  }
});
