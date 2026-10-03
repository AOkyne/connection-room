// Admin operations for "Your Experience Wanted" (server only, service
// role). Moderators may see who asked an anonymous question; nothing
// here is exposed to members.

import type { SupabaseClient } from "@supabase/supabase-js";
import seedFileJson from "@/supabase/seed/experience-seed-questions.json";
import { logEmailSend, sendExperienceEmail } from "@/lib/email/send";
import { renderInvitationEmail } from "./email";
import { waveIsDue } from "./engine";
import { appUrl } from "./mailer";
import { computeMetrics, type MetricContribution, type MetricInvitation } from "./metrics";
import { normalizeQuestionText } from "./normalize";
import { phaseAt } from "./policy";
import { planWave } from "./selection";
import { planSeedImport, type SeedFile } from "./seed-import";
import { mapQuestion, mapSettings, SupabaseExperienceStore } from "./supabase-store";
import { bootstrapEndFor, DAY_MS, isValidTimeZone } from "./time";

const seedFile = seedFileJson as SeedFile;
export const DRY_RUN_VALID_MINUTES = 60;

async function audit(supabase: SupabaseClient, actorId: string, action: string, detail: Record<string, unknown> = {}, questionId?: string, invitationId?: string) {
  await supabase.from("experience_audit").insert({
    actor_id: actorId,
    action,
    detail,
    question_id: questionId || null,
    invitation_id: invitationId || null,
  });
}

async function namesFor(supabase: SupabaseClient, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map<string, string>();
  const { data } = await supabase.from("profiles").select("user_id, display_name").in("user_id", unique);
  return new Map((data || []).map((p) => [p.user_id, p.display_name as string]));
}

export async function loadOverview(supabase: SupabaseClient) {
  const store = new SupabaseExperienceStore(supabase);
  const [settingsRow, questions, invitations, waves, reports, prefsOut, complaints, existingForSeeds, topics] = await Promise.all([
    supabase.from("experience_settings").select("*").eq("id", 1).single(),
    supabase.from("experience_questions").select("*").order("created_at", { ascending: false }),
    supabase
      .from("experience_invitations")
      .select("id, user_id, question_id, state, sent_at, claimed_at, first_visit_at, drop_reason, needs_review, last_error, due_at, attempts"),
    supabase.from("experience_waves").select("*").order("starts_at", { ascending: false }).limit(6),
    supabase.from("reports").select("id, post_id, comment_id, reason, status, created_at, reporter_id, reported_user_id").eq("status", "open"),
    supabase.from("experience_preferences").select("user_id", { count: "exact", head: true }).eq("opted_out", true),
    supabase.from("email_suppressions").select("email", { count: "exact", head: true }).eq("reason", "complaint"),
    supabase.from("experience_questions").select("id, seed_key, text, normalized_text, seed_imported_text, staff_edited"),
    supabase.from("experience_topics").select("*").order("sort_order"),
  ]);
  const settings = mapSettings(settingsRow.data);
  const qRows = questions.data || [];
  const invRows = invitations.data || [];

  // Thread contributions (real authors) for metrics and per-question counts.
  const qs = qRows.map(mapQuestion);
  const questionByPost = new Map<string, string>();
  for (const q of qs) for (const t of q.threadPostIds) questionByPost.set(t, q.id);
  const postIds = [...questionByPost.keys()];
  const { data: comments } = postIds.length
    ? await supabase.from("comments").select("id, post_id, user_id, parent_comment_id, created_at").in("post_id", postIds).is("deleted_at", null)
    : { data: [] as any[] };
  const commentIds = (comments || []).map((c: any) => c.id);
  const { data: anon } = commentIds.length
    ? await supabase.from("experience_anonymous_comments").select("comment_id, real_user_id").in("comment_id", commentIds)
    : { data: [] as any[] };
  const realOf = new Map((anon || []).map((a: any) => [a.comment_id, a.real_user_id]));
  const authorOfComment = new Map((comments || []).map((c: any) => [c.id, realOf.get(c.id) || c.user_id]));
  const contributions: MetricContribution[] = (comments || []).map((c: any) => ({
    userId: realOf.get(c.id) || c.user_id,
    questionId: questionByPost.get(c.post_id)!,
    isReply: !!c.parent_comment_id,
    parentAuthorId: c.parent_comment_id ? authorOfComment.get(c.parent_comment_id) || null : null,
    createdAt: new Date(c.created_at),
  }));
  const metricInvitations: MetricInvitation[] = invRows.map((i: any) => ({
    userId: i.user_id,
    questionId: i.question_id,
    state: i.state,
    sentAt: i.sent_at ? new Date(i.sent_at) : null,
    firstVisitAt: i.first_visit_at ? new Date(i.first_visit_at) : null,
    dropReason: i.drop_reason,
    needsReview: !!i.needs_review,
  }));
  const metrics = computeMetrics(metricInvitations, contributions, {
    attributionDays: settings.attributionDays,
    optOuts: prefsOut.count || 0,
    complaints: complaints.count || 0,
  });

  const responsesByQuestion = new Map<string, number>();
  for (const c of contributions) if (!c.isReply) responsesByQuestion.set(c.questionId, (responsesByQuestion.get(c.questionId) || 0) + 1);
  const sentByQuestion = new Map<string, number>();
  for (const i of invRows) if (i.state === "sent") sentByQuestion.set(i.question_id, (sentByQuestion.get(i.question_id) || 0) + 1);

  const experienceReports = (reports.data || []).filter((r: any) => questionByPost.has(r.post_id));
  const names = await namesFor(supabase, [
    ...qRows.map((q: any) => q.author_id),
    ...experienceReports.map((r: any) => r.reported_user_id),
    ...experienceReports.map((r: any) => r.reporter_id),
    ...invRows.filter((i: any) => i.needs_review || i.drop_reason === "delivery_failed").map((i: any) => i.user_id),
  ]);
  const textOf = new Map(qRows.map((q: any) => [q.id, q.text as string]));

  const seedPlan = planSeedImport(
    seedFile,
    (existingForSeeds.data || []) as any,
    new Set((topics.data || []).map((t: any) => t.slug))
  );
  const latestWave = await store.getLatestWave();

  return {
    settings: {
      ...settingsRow.data,
      phase: settings.launchedAt ? phaseAt(new Date(), settings) : null,
      nextWaveAt:
        settings.enabled && !settings.paused && settings.launchedAt
          ? latestWave
            ? new Date(latestWave.startsAt.getTime() + settings.waveIntervalDays * DAY_MS).toISOString()
            : "next scheduler run"
          : null,
      waveDueNow: settings.enabled && settings.launchedAt ? waveIsDue(latestWave, new Date(), settings) : false,
    },
    topics: topics.data || [],
    questions: qRows.map((q: any) => ({
      id: q.id,
      source: q.source,
      seedKey: q.seed_key,
      text: q.text,
      context: q.context,
      topic: q.topic,
      status: q.status,
      anonymous: q.anonymous,
      authorName: q.author_id ? names.get(q.author_id) || "(member)" : null,
      emailPermission: q.email_permission,
      emailReview: q.email_review,
      emailTextMatches: q.email_text === q.text,
      firstActivatedAt: q.first_activated_at,
      hasThread: !!q.thread_post_id,
      similarTo: q.similar_to_question_id ? textOf.get(q.similar_to_question_id) || null : null,
      staffEdited: q.staff_edited,
      invitationsSent: sentByQuestion.get(q.id) || 0,
      responses: responsesByQuestion.get(q.id) || 0,
    })),
    queue: {
      emailReview: qRows.filter((q: any) => q.source === "member" && q.email_permission && q.email_review === "pending" && q.status === "open").length,
      similar: qRows.filter((q: any) => q.similar_to_question_id && q.status === "open").length,
      reports: experienceReports.map((r: any) => ({
        id: r.id,
        reason: r.reason,
        createdAt: r.created_at,
        questionText: textOf.get(questionByPost.get(r.post_id)!) || "",
        onComment: !!r.comment_id,
        reportedName: r.reported_user_id ? names.get(r.reported_user_id) || "(member)" : "Community prompt",
        reporterName: names.get(r.reporter_id) || "(member)",
      })),
      unknownDeliveries: invRows
        .filter((i: any) => i.state === "unknown" && i.needs_review)
        .map((i: any) => ({ id: i.id, memberName: names.get(i.user_id) || "(member)", claimedAt: i.claimed_at, error: i.last_error })),
      failures: invRows
        .filter((i: any) => i.drop_reason === "delivery_failed")
        .slice(0, 20)
        .map((i: any) => ({ id: i.id, memberName: names.get(i.user_id) || "(member)", error: i.last_error, attempts: i.attempts })),
    },
    pending: invRows.filter((i: any) => ["scheduled", "retry", "sending"].includes(i.state)).length,
    waves: (waves.data || []).map((w: any) => ({ id: w.id, startsAt: w.starts_at, phase: w.phase, sourceMode: w.source_mode, summary: w.summary })),
    metrics,
    seeds: {
      inFile: seedFile.questions.length,
      toImport: seedPlan.insert.length,
      upstreamChanged: seedPlan.upstreamChanged,
      duplicateText: seedPlan.duplicateText.length,
    },
  };
}

export async function runDryRun(supabase: SupabaseClient, actorId: string) {
  const store = new SupabaseExperienceStore(supabase);
  const now = new Date();
  const settings = await store.getSettings();
  // Before launch, preview as if launching now (bootstrap rules apply).
  const effective = settings.launchedAt
    ? settings
    : { ...settings, launchedAt: now, bootstrapEndsAt: bootstrapEndFor(now, settings.timezone) };
  const snapshot = await store.loadPlanningSnapshot();
  const plan = planWave({ ...snapshot, now, waveId: "dry-run", settings: effective });

  await supabase.from("experience_settings").update({ last_dry_run_at: now.toISOString() }).eq("id", 1);
  await audit(supabase, actorId, "dry_run", { planned: plan.assignments.length });

  const names = await namesFor(supabase, [...plan.assignments.map((a) => a.userId), ...plan.memberExclusionDetail.map((e) => e.userId)]);
  const text = new Map(snapshot.questions.map((q) => [q.id, { text: q.text, source: q.source }]));
  return {
    ranAt: now.toISOString(),
    phase: plan.phase,
    eligibleQuestions: plan.eligibleQuestionIds.length,
    members: snapshot.members.length,
    planned: plan.assignments.length,
    questionExclusions: plan.questionExclusions,
    memberExclusions: plan.memberExclusions,
    assignments: plan.assignments.map((a) => ({
      member: names.get(a.userId) || "(member)",
      question: text.get(a.questionId)?.text || "",
      source: text.get(a.questionId)?.source,
      dueAt: a.dueAt.toISOString(),
      reason: a.reason,
    })),
    excluded: plan.memberExclusionDetail.map((e) => ({ member: names.get(e.userId) || "(member)", reason: e.reason })),
  };
}

export async function activate(supabase: SupabaseClient, actorId: string) {
  const { data: row } = await supabase.from("experience_settings").select("*").eq("id", 1).single();
  if (!row) throw new Error("Settings missing");
  if (!row.last_dry_run_at || Date.now() - Date.parse(row.last_dry_run_at) > DRY_RUN_VALID_MINUTES * 60_000) {
    throw new Error(`Run a dry run first (within the last ${DRY_RUN_VALID_MINUTES} minutes), then activate.`);
  }
  if (!row.system_author_id) throw new Error("Choose the account that owns community prompt threads first.");
  const now = new Date();
  const patch: Record<string, unknown> = { enabled: true, paused: false };
  if (!row.launched_at) {
    // The one and only launch: fixes the global 3-month bootstrap window.
    patch.launched_at = now.toISOString();
    patch.bootstrap_ends_at = bootstrapEndFor(now, row.timezone).toISOString();
  }
  const { error } = await supabase.from("experience_settings").update(patch).eq("id", 1);
  if (error) throw new Error(error.message);
  await audit(supabase, actorId, row.launched_at ? "reactivated" : "launched", { launchedAt: patch.launched_at || row.launched_at });
}

export async function setPaused(supabase: SupabaseClient, actorId: string, paused: boolean) {
  const { error } = await supabase.from("experience_settings").update({ paused }).eq("id", 1);
  if (error) throw new Error(error.message);
  await audit(supabase, actorId, paused ? "paused" : "resumed");
}

export async function saveSettings(supabase: SupabaseClient, actorId: string, input: Record<string, unknown>) {
  const { data: row } = await supabase.from("experience_settings").select("launched_at").eq("id", 1).single();
  const patch: Record<string, unknown> = {};
  const int = (v: unknown, min: number, max: number, name: string) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be between ${min} and ${max}.`);
    return n;
  };
  if (input.postBootstrapMode !== undefined) {
    if (input.postBootstrapMode !== "recycle_and_member" && input.postBootstrapMode !== "member_only") throw new Error("Invalid mode");
    patch.post_bootstrap_mode = input.postBootstrapMode;
  }
  if (input.waveIntervalDays !== undefined) patch.wave_interval_days = int(input.waveIntervalDays, 14, 21, "Wave interval");
  if (input.staggerDays !== undefined) patch.stagger_days = int(input.staggerDays, 1, 7, "Delivery window");
  if (input.perQuestionCap !== undefined) patch.per_question_cap = int(input.perQuestionCap, 1, 50, "Recipients per question");
  if (input.attributionDays !== undefined) patch.attribution_days = int(input.attributionDays, 1, 60, "Attribution window");
  if (input.timezone !== undefined) {
    if (row?.launched_at) throw new Error("The timezone is locked after launch.");
    if (typeof input.timezone !== "string" || !isValidTimeZone(input.timezone)) throw new Error("Unknown timezone");
    patch.timezone = input.timezone;
  }
  if (input.testRecipients !== undefined) {
    const list = String(input.testRecipients)
      .split(/[\s,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (list.some((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) throw new Error("Test recipients must be email addresses.");
    patch.test_recipients = list.slice(0, 10);
  }
  if (input.systemAuthorId !== undefined) patch.system_author_id = input.systemAuthorId || null;
  const { error } = await supabase.from("experience_settings").update(patch).eq("id", 1);
  if (error) throw new Error(error.message);
  await audit(supabase, actorId, "settings_changed", { fields: Object.keys(patch) });
}

export async function importSeeds(supabase: SupabaseClient, actorId: string) {
  const [{ data: existing }, { data: topics }] = await Promise.all([
    supabase.from("experience_questions").select("id, seed_key, text, normalized_text, seed_imported_text, staff_edited"),
    supabase.from("experience_topics").select("slug"),
  ]);
  const plan = planSeedImport(seedFile, (existing || []) as any, new Set((topics || []).map((t) => t.slug)));
  let inserted = 0;
  for (const s of plan.insert) {
    const { error } = await supabase.from("experience_questions").insert({
      source: "seed",
      seed_key: s.seedKey,
      text: s.text,
      normalized_text: s.normalized,
      topic: s.topic,
      status: "open",
      email_permission: true,
      email_review: "approved",
      email_text: s.text,
      seed_imported_text: s.text,
      similar_to_question_id: s.similarToId,
    });
    if (!error) inserted += 1;
    else if (error.code !== "23505") throw new Error(error.message);
  }
  await audit(supabase, actorId, "seed_import", { inserted, unchanged: plan.unchanged.length, upstreamChanged: plan.upstreamChanged.length });
  return { inserted, unchanged: plan.unchanged.length, upstreamChanged: plan.upstreamChanged.length, duplicateText: plan.duplicateText.length };
}

/** Explicit update path for a seed whose wording changed in the seed file. */
export async function applySeedUpdate(supabase: SupabaseClient, actorId: string, questionId: string) {
  const { data: q } = await supabase.from("experience_questions").select("*").eq("id", questionId).single();
  if (!q || q.source !== "seed") throw new Error("Not a seed question");
  if (q.staff_edited) throw new Error("Staff have edited this question; edit it by hand instead.");
  const seed = seedFile.questions.find((s) => s.id === q.seed_key);
  if (!seed) throw new Error("Seed no longer in the file");
  const text = seed.text.trim();
  const { error } = await supabase
    .from("experience_questions")
    .update({ text, normalized_text: normalizeQuestionText(text), email_text: text, seed_imported_text: text, updated_at: new Date().toISOString() })
    .eq("id", questionId);
  if (error) throw new Error(error.code === "23505" ? "That wording matches another question." : error.message);
  if (q.thread_post_id) await supabase.from("posts").update({ body: text }).eq("id", q.thread_post_id);
  await audit(supabase, actorId, "seed_update_applied", { fields: ["text"] }, questionId);
}

/** Staff edit / moderation of a question. Identity never changes. */
export async function updateQuestion(supabase: SupabaseClient, actorId: string, questionId: string, input: Record<string, unknown>) {
  const { data: q } = await supabase.from("experience_questions").select("*").eq("id", questionId).single();
  if (!q) throw new Error("Not found");
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const changed: string[] = [];

  if (typeof input.text === "string" && input.text.trim() !== q.text) {
    const text = input.text.trim().replace(/\s+/g, " ");
    if (text.length < 10 || text.length > 300) throw new Error("Questions need 10-300 characters.");
    patch.text = text;
    patch.normalized_text = normalizeQuestionText(text);
    patch.staff_edited = true;
    // Staff-approved wording for seeds; member text must be re-approved explicitly.
    if (q.source === "seed") patch.email_text = text;
    else if (q.email_review === "approved") patch.email_review = "pending";
    changed.push("text");
    if (q.thread_post_id) await supabase.from("posts").update({ body: text }).eq("id", q.thread_post_id);
  }
  if (typeof input.topic === "string") {
    patch.topic = input.topic;
    changed.push("topic");
  }
  if (input.status === "open" || input.status === "closed" || input.status === "removed") {
    patch.status = input.status;
    changed.push(`status:${input.status}`);
  }
  if (input.emailReview === "approved" || input.emailReview === "rejected") {
    if (q.source === "member" && input.emailReview === "approved" && !q.email_permission) {
      throw new Error("The author hasn't allowed this question in emails.");
    }
    patch.email_review = input.emailReview;
    patch.email_text = input.emailReview === "approved" ? ((patch.text as string) || q.text) : q.email_text;
    changed.push(`email_review:${input.emailReview}`);
  }
  if (input.clearSimilarFlag === true) {
    patch.similar_to_question_id = null;
    changed.push("similar_flag_cleared");
  }
  const { error } = await supabase.from("experience_questions").update(patch).eq("id", questionId);
  if (error) throw new Error(error.code === "23505" ? "That wording matches another question." : error.message);
  await audit(supabase, actorId, "question_updated", { changed }, questionId);
}

/** Resolve an 'unknown' delivery after checking the provider's logs. */
export async function resolveInvitation(supabase: SupabaseClient, actorId: string, invitationId: string, outcome: "sent" | "not_sent") {
  const { data: inv } = await supabase.from("experience_invitations").select("*").eq("id", invitationId).single();
  if (!inv || inv.state !== "unknown") throw new Error("Only deliveries marked unknown can be resolved.");
  const patch =
    outcome === "sent"
      ? { state: "sent", sent_at: inv.claimed_at, needs_review: false }
      : // Confirmed never accepted: release the reservation (no resend is
        // queued; the member is simply eligible again in a later wave).
        { state: "canceled", drop_reason: "confirmed_not_sent", needs_review: false };
  const { error } = await supabase.from("experience_invitations").update(patch).eq("id", invitationId).eq("state", "unknown");
  if (error) throw new Error(error.message);
  await audit(supabase, actorId, "delivery_resolved", { outcome }, undefined, invitationId);
}

export async function resolveReport(supabase: SupabaseClient, actorId: string, reportId: string, status: "resolved" | "dismissed") {
  const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
  if (error) throw new Error(error.message);
  await audit(supabase, actorId, "report_" + status, { reportId });
}

/** Preview email to a designated TEST address only -- never a member, never the ledger. */
export async function sendTestEmail(supabase: SupabaseClient, actorId: string, to: string, questionId?: string) {
  const { data: settings } = await supabase.from("experience_settings").select("test_recipients").eq("id", 1).single();
  const allowed: string[] = settings?.test_recipients || [];
  const address = to.trim().toLowerCase();
  if (!allowed.includes(address)) throw new Error("Add this address to Test recipients first. Test emails only go to those.");

  let q: any = null;
  if (questionId) q = (await supabase.from("experience_questions").select("*").eq("id", questionId).maybeSingle()).data;
  if (!q) q = (await supabase.from("experience_questions").select("*").eq("email_review", "approved").limit(1).maybeSingle()).data;
  if (!q) throw new Error("Import the seed bank or approve a question first.");

  const base = appUrl();
  const email = renderInvitationEmail({
    firstName: "there",
    source: q.source,
    questionText: q.email_text || q.text,
    threadUrl: `${base}/app/experience/${q.id}?respond=1`,
    preferencesUrl: `${base}/app/experience/preferences`,
    unsubscribeUrl: `${base}/app/experience/preferences`,
  });
  const result = await sendExperienceEmail({
    to: address,
    subject: `[TEST] ${email.subject}`,
    html: email.html,
    text: email.text,
    messageId: `<experience-test-${crypto.randomUUID()}@${new URL(base).host}>`,
  });
  if (result.kind !== "accepted") throw new Error(`Test email not accepted: ${result.error}`);
  await logEmailSend(supabase, { category: "experience_test", to: address, subject: `[TEST] ${email.subject}` });
  await audit(supabase, actorId, "test_email_sent", {}, q.id);
}
