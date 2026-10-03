import { describe, it, expect } from "vitest";
import { runExperienceTick } from "./engine";
import { frequencyBlock } from "./policy";
import { DAY_MS, monthKey, zonedParts, zonedToUtc } from "./time";
import {
  FakeMailer,
  LA,
  everyHours,
  makeMember,
  makeMemberQuestion,
  makeSeed,
  makeStore,
} from "./test-fixtures";

const launch = zonedToUtc(2027, 1, 4, 8, 0, LA); // Monday Jan 4 2027, 08:00 LA

function members(n: number) {
  return Array.from({ length: n }, (_, i) => makeMember(`m${String(i).padStart(3, "0")}`));
}
function seeds(n: number, topic = "friendship") {
  return Array.from({ length: n }, (_, i) => makeSeed(`s${i}`, topic));
}

describe("waves, staggering and caps", () => {
  it("spreads one wave across members, questions and the 7-day window, 09:00-18:00 local", async () => {
    const store = makeStore(launch, { members: members(30), questions: seeds(10) });
    const mailer = new FakeMailer();
    const report = await runExperienceTick(store, mailer, launch);
    expect(report.wave?.inserted).toBe(30);

    const perQuestion = new Map<string, number>();
    const days = new Set<string>();
    for (const inv of store.invitations) {
      perQuestion.set(inv.questionId, (perQuestion.get(inv.questionId) || 0) + 1);
      const local = zonedParts(inv.dueAt, LA);
      expect(local.hour).toBeGreaterThanOrEqual(9);
      expect(local.hour).toBeLessThan(18);
      expect(inv.dueAt.getTime()).toBeGreaterThanOrEqual(launch.getTime());
      expect(inv.dueAt.getTime()).toBeLessThan(launch.getTime() + 7 * DAY_MS);
      days.add(`${local.month}-${local.day}`);
    }
    // Not one question for the whole wave, none above the cap of 5.
    expect(perQuestion.size).toBeGreaterThanOrEqual(6);
    expect(Math.max(...perQuestion.values())).toBeLessThanOrEqual(5);
    // Deliveries spread over several days.
    expect(days.size).toBeGreaterThanOrEqual(5);
    // Nothing goes out before its due time.
    expect(mailer.sent.length).toBe(0);
  });

  it("caps recipients per question per wave and skips members with nothing left", async () => {
    const store = makeStore(launch, { members: members(12), questions: seeds(2) });
    await runExperienceTick(store, new FakeMailer(), launch);
    expect(store.invitations.length).toBe(10); // 2 questions x cap 5
  });

  it("does not catch up missed waves or burst a backlog after downtime", async () => {
    const store = makeStore(launch, { members: members(20), questions: seeds(5) });
    const mailer = new FakeMailer();
    await runExperienceTick(store, mailer, launch); // wave 1 planned
    // The scheduler is down for 60 days.
    const back = new Date(launch.getTime() + 60 * DAY_MS);
    const report = await runExperienceTick(store, mailer, back);
    expect(report.expired).toBe(20); // wave-1 invitations expired, not sent
    expect(store.waves.length).toBe(2); // exactly one new wave, not three
    expect(report.sent).toBe(0);
  });
});

describe("member cadence vs campaign cadence", () => {
  it("adjacent waves never give a member more than one invitation a month or within 30 days", async () => {
    const store = makeStore(launch, {
      members: members(8),
      questions: seeds(20),
      settings: { waveIntervalDays: 14 },
    });
    const mailer = new FakeMailer();
    await everyHours(launch, new Date(launch.getTime() + 120 * DAY_MS), 1, async (now) => {
      await runExperienceTick(store, mailer, now);
    });
    const byMember = new Map<string, Date[]>();
    for (const s of mailer.sent) byMember.set(s.userId, [...(byMember.get(s.userId) || []), s.at]);
    for (const [, times] of byMember) {
      times.sort((a, b) => a.getTime() - b.getTime());
      const months = times.map((t) => monthKey(t, LA));
      expect(new Set(months).size).toBe(months.length);
      for (let i = 1; i < times.length; i++) {
        expect(times[i].getTime() - times[i - 1].getTime()).toBeGreaterThanOrEqual(30 * DAY_MS);
      }
    }
    // Waves ran every 14 days, so members necessarily skipped some.
    expect(store.waves.length).toBeGreaterThanOrEqual(8);
    expect(mailer.sent.length).toBeLessThan(store.waves.length * 8);
  });

  it("a manual / admin-inserted extra invitation can't bypass the limits", async () => {
    const store = makeStore(launch, { members: members(1), questions: seeds(3) });
    const mailer = new FakeMailer();
    await everyHours(launch, new Date(launch.getTime() + 8 * DAY_MS), 1, (now) => runExperienceTick(store, mailer, now).then(() => {}));
    expect(mailer.sent.length).toBe(1);
    const sentAt = mailer.sent[0].at;

    // An admin tool inserts another invitation for later the same month.
    const due = new Date(sentAt.getTime() + 2 * DAY_MS);
    store.insertInvitation({
      id: "manual-1", waveId: null, userId: "m000", questionId: "s2", state: "scheduled",
      dueAt: due, windowEndsAt: new Date(due.getTime() + DAY_MS), selectionReason: "manual",
      dropReason: null, attempts: 0, claimedAt: null, sentAt: null, providerMessageId: null, needsReview: false,
    });
    await runExperienceTick(store, mailer, new Date(due.getTime() + 3600_000));
    expect(mailer.sent.length).toBe(1);
    expect(store.invitations.find((i) => i.id === "manual-1")?.state).toBe("dropped");
  });

  it("a definitive pre-acceptance failure retries the SAME invitation and still counts only once", async () => {
    const store = makeStore(launch, { members: members(1), questions: seeds(3) });
    const mailer = new FakeMailer();
    mailer.next = [{ kind: "rejected", error: "421 try again" }];
    await everyHours(launch, new Date(launch.getTime() + 8 * DAY_MS), 1, (now) => runExperienceTick(store, mailer, now).then(() => {}));
    expect(mailer.sent.length).toBe(1);
    expect(store.invitations.length).toBe(1);
    expect(store.invitations[0].attempts).toBe(2);
  });
});

describe("ambiguous delivery", () => {
  it("a provider timeout is never resent, counts toward the limits and is flagged for review", async () => {
    const store = makeStore(launch, { members: members(1), questions: seeds(5) });
    const mailer = new FakeMailer();
    mailer.next = [{ kind: "ambiguous", error: "socket timeout" }];
    await everyHours(launch, new Date(launch.getTime() + 20 * DAY_MS), 1, (now) => runExperienceTick(store, mailer, now).then(() => {}));
    expect(mailer.sent.length).toBe(0);
    const inv = store.invitations[0];
    expect(inv.state).toBe("unknown");
    expect(inv.needsReview).toBe(true);
    // It reserved the member's allowance: nothing else this month or within 30 days.
    expect(store.invitations.length).toBe(1);
    expect(frequencyBlock(store.countingHistory("m000"), new Date(inv.claimedAt!.getTime() + 10 * DAY_MS), LA)).not.toBeNull();
  });

  it("a worker that dies mid-send leaves 'sending', which becomes 'unknown' -- not a resend", async () => {
    const store = makeStore(launch, { members: members(1), questions: seeds(2) });
    await runExperienceTick(store, new FakeMailer(), launch);
    const inv = store.invitations[0];
    expect(await store.claim(inv.id, inv.dueAt)).toBe("ok"); // claimed, then the worker crashed
    const mailer = new FakeMailer();
    await runExperienceTick(store, mailer, new Date(inv.dueAt.getTime() + 3600_000));
    expect(inv.state).toBe("unknown");
    expect(mailer.sent.length).toBe(0);
  });

  it("concurrent workers cannot double-send", async () => {
    const store = makeStore(launch, { members: members(15), questions: seeds(5) });
    const mailer = new FakeMailer();
    mailer.delayMs = 2;
    await runExperienceTick(store, mailer, launch);
    const later = new Date(launch.getTime() + 8 * DAY_MS - 3600_000);
    await Promise.all([1, 2, 3, 4].map(() => runExperienceTick(store, mailer, later)));
    const ids = mailer.sent.map((s) => s.invitationId);
    expect(new Set(ids).size).toBe(ids.length);
    const users = mailer.sent.map((s) => s.userId);
    expect(new Set(users).size).toBe(users.length);
  });
});

describe("canonical question deduplication", () => {
  it("a member never receives the same question twice across edits, recycling and continuation threads", async () => {
    const qs = seeds(3);
    const store = makeStore(launch, { members: members(3), questions: qs, settings: { perQuestionCap: 3 } });
    const mailer = new FakeMailer();
    await everyHours(launch, new Date(launch.getTime() + 200 * DAY_MS), 2, async (now) => {
      // Staff edit a question's wording and an admin starts a continuation thread mid-way.
      if (now.getTime() === launch.getTime() + 50 * DAY_MS) {
        const q = store.questions.get("s0")!;
        q.text = q.emailText = "Reworded question?";
        if (q.threadPostId) q.threadPostIds = [...q.threadPostIds, (q.threadPostId = "continuation-s0")];
      }
      await runExperienceTick(store, mailer, now);
    });
    const pairs = mailer.sent.map((s) => `${s.userId}:${s.questionId}`);
    expect(new Set(pairs).size).toBe(pairs.length);
    // 3 members x 3 questions is the most that can ever be sent.
    expect(mailer.sent.length).toBeLessThanOrEqual(9);
  });

  it("the ledger rejects a duplicate member/question invitation even if a caller forces it", () => {
    const store = makeStore(launch, { members: members(1), questions: seeds(1) });
    const base = {
      waveId: null, userId: "m000", questionId: "s0", state: "sent" as const, dueAt: launch,
      windowEndsAt: new Date(launch.getTime() + DAY_MS), selectionReason: null, dropReason: null,
      attempts: 1, claimedAt: launch, sentAt: launch, providerMessageId: "x", needsReview: false,
    };
    expect(store.insertInvitation({ ...base, id: "a" })).toBe(true);
    expect(store.insertInvitation({ ...base, id: "b", state: "scheduled" })).toBe(false);
  });

  it("excludes members who already answered the question", async () => {
    const store = makeStore(launch, { members: members(2), questions: seeds(1) });
    store.addAnswer("s0", "m000");
    await runExperienceTick(store, new FakeMailer(), launch);
    expect(store.invitations.map((i) => i.userId)).toEqual(["m001"]);
  });
});

describe("bootstrap boundary", () => {
  it("an invitation planned in bootstrap but due after it follows the post-bootstrap rules", async () => {
    const store = makeStore(launch, { members: members(1), questions: seeds(1) });
    const end = store.settings.bootstrapEndsAt!;
    const waveStart = new Date(end.getTime() - 2 * DAY_MS);
    // Force the wave to start 2 days before the boundary.
    store.waves.push({ id: "w0", startsAt: new Date(waveStart.getTime() - 21 * DAY_MS), windowEndsAt: waveStart, phase: "bootstrap", sourceMode: "bootstrap" });
    await runExperienceTick(store, new FakeMailer(), waveStart);
    const inv = store.invitations[0];
    // Make it due after the boundary.
    inv.dueAt = new Date(end.getTime() + 3600_000);
    const mailer = new FakeMailer();
    await runExperienceTick(store, mailer, new Date(end.getTime() + 2 * 3600_000));
    expect(mailer.sent.length).toBe(0);
    expect(inv.state).toBe("dropped");
    expect(inv.dropReason).toBe("seed_not_activated_during_bootstrap");
  });

  it("post-bootstrap modes: recycle uses bootstrap-activated seeds; member_only uses only member questions; nothing qualifies -> no sends", async () => {
    for (const mode of ["recycle_and_member", "member_only"] as const) {
      const store = makeStore(launch, {
        members: members(6),
        questions: [makeSeed("used", "friendship", { firstActivatedAt: launch, threadPostId: "t", threadPostIds: ["t"] }), makeSeed("fresh")],
        settings: { postBootstrapMode: mode },
      });
      const after = new Date(store.settings.bootstrapEndsAt!.getTime() + DAY_MS);
      await runExperienceTick(store, new FakeMailer(), after);
      const used = new Set(store.invitations.map((i) => i.questionId));
      if (mode === "recycle_and_member") {
        expect([...used]).toEqual(["used"]);
      } else {
        expect(used.size).toBe(0); // exhaustion: no member questions -> skip, never invent one
        expect(store.waves.length).toBe(1);
      }
    }
  });

  it("prefers member questions over seeds", async () => {
    const store = makeStore(launch, {
      members: members(3),
      questions: [makeSeed("s0"), makeMemberQuestion("mq", "author")],
    });
    await runExperienceTick(store, new FakeMailer(), launch);
    expect(store.invitations.every((i) => i.questionId === "mq")).toBe(true);
  });
});

describe("changes between assignment and dispatch", () => {
  const cases: Array<[string, (s: ReturnType<typeof makeStore>) => void, string]> = [
    ["opt-out", (s) => (s.members.get("m000")!.prefs.optedOut = true), "opted_out"],
    ["pause", (s) => (s.members.get("m000")!.prefs.paused = true), "paused"],
    ["suspension", (s) => (s.members.get("m000")!.suspended = true), "account_suspended"],
    ["account deletion", (s) => s.members.delete("m000"), "account_deleted"],
    ["author withdraws email permission", (s) => (s.questions.get("mq")!.emailPermission = false), "author_email_permission_off"],
    ["question removed", (s) => (s.questions.get("mq")!.status = "removed"), "question_removed"],
    ["block", (s) => s.block("m000", "author"), "blocked"],
    ["bounce suppression", (s) => s.suppressedEmails.add("m000@example.test"), "email_suppressed"],
    ["open report", (s) => s.openReportQuestionIds.add("mq"), "question_has_open_report"],
    ["answered in the meantime", (s) => s.addAnswer("mq", "m000"), "already_answered"],
  ];

  for (const [label, change, reason] of cases) {
    it(`drops the invitation after ${label}, without a replacement send`, async () => {
      const store = makeStore(launch, { members: [makeMember("m000")], questions: [makeMemberQuestion("mq", "author")] });
      await runExperienceTick(store, new FakeMailer(), launch);
      const inv = store.invitations[0];
      change(store);
      const mailer = new FakeMailer();
      await runExperienceTick(store, mailer, new Date(inv.dueAt.getTime() + 60_000));
      expect(mailer.sent.length).toBe(0);
      expect(inv.state).toBe("dropped");
      expect(inv.dropReason).toBe(reason);
      expect(store.invitations.length).toBe(1);
    });
  }

  it("sensitive topics are only sent to members who chose them", async () => {
    const chose = makeMember("chose", { prefs: { optedOut: false, paused: false, topics: ["dating"], timezone: null } });
    const store = makeStore(launch, { members: [chose, makeMember("default")], questions: [makeSeed("d", "dating")] });
    await runExperienceTick(store, new FakeMailer(), launch);
    expect(store.invitations.map((i) => i.userId)).toEqual(["chose"]);
  });

  it("pause stops pending sends; resuming does not reset limits or the launch", async () => {
    const store = makeStore(launch, { members: members(3), questions: seeds(3) });
    await runExperienceTick(store, new FakeMailer(), launch);
    store.settings.paused = true;
    const mailer = new FakeMailer();
    await everyHours(launch, new Date(launch.getTime() + 3 * DAY_MS), 1, (now) => runExperienceTick(store, mailer, now).then(() => {}));
    expect(mailer.sent.length).toBe(0);
    const launchedAt = store.settings.launchedAt;
    store.settings.paused = false;
    await everyHours(new Date(launch.getTime() + 3 * DAY_MS), new Date(launch.getTime() + 8 * DAY_MS), 1, (now) => runExperienceTick(store, mailer, now).then(() => {}));
    expect(store.settings.launchedAt).toBe(launchedAt);
    expect(mailer.sent.length).toBeLessThanOrEqual(3);
  });

  it("does nothing when the feature is disabled", async () => {
    const store = makeStore(launch, { members: members(3), questions: seeds(3), settings: { enabled: false } });
    const report = await runExperienceTick(store, new FakeMailer(), launch);
    expect(report.status).toBe("disabled");
    expect(store.waves.length).toBe(0);
  });
});

describe("wave size", () => {
  it("never invites more than 25% of members in one wave, and rotates the rest into later waves", async () => {
    const store = makeStore(launch, { members: members(40), questions: seeds(30), settings: { maxWaveSharePercent: 25 } });
    const mailer = new FakeMailer();
    await everyHours(launch, new Date(launch.getTime() + 64 * DAY_MS), 1, (now) => runExperienceTick(store, mailer, now).then(() => {}));
    const perWave = new Map<string, number>();
    for (const inv of store.invitations) perWave.set(inv.waveId!, (perWave.get(inv.waveId!) || 0) + 1);
    expect(Math.max(...perWave.values())).toBeLessThanOrEqual(10);
    // Fair rotation: 10 per wave, and nobody is invited twice before
    // everyone has been invited once (4 waves x 10 = all 40 members).
    expect(store.waves.length).toBe(4);
    expect(store.invitations.length).toBe(40);
    expect(new Set(store.invitations.map((i) => i.userId)).size).toBe(40);
  });
});

describe("single question per wave", () => {
  it("gives everyone in a wave the same question, up to 25% of members", async () => {
    const store = makeStore(launch, {
      members: members(40),
      questions: seeds(6),
      settings: { maxWaveSharePercent: 25, singleQuestionPerWave: true },
    });
    await runExperienceTick(store, new FakeMailer(), launch);
    expect(store.invitations.length).toBe(10);
    expect(new Set(store.invitations.map((i) => i.questionId)).size).toBe(1);
  });

  it("picks the question the most members can receive, and skips members who can't get it", async () => {
    const chose = (id: string) => makeMember(id, { prefs: { optedOut: false, paused: false, topics: ["dating"], timezone: null } });
    const store = makeStore(launch, {
      members: [chose("d1"), chose("d2"), ...members(6)],
      questions: [makeSeed("dating-q", "dating"), makeSeed("general-q", "friendship")],
      settings: { maxWaveSharePercent: 100, singleQuestionPerWave: true },
    });
    store.addAnswer("general-q", "m000");
    await runExperienceTick(store, new FakeMailer(), launch);
    // 5 of the general members can take general-q (m000 already answered);
    // only 2 could take dating-q. Everyone invited gets general-q.
    expect(new Set(store.invitations.map((i) => i.questionId))).toEqual(new Set(["general-q"]));
    expect(store.invitations.map((i) => i.userId).sort()).toEqual(["m001", "m002", "m003", "m004", "m005"]);
  });
});
