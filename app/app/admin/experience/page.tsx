"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";

type Tab = "setup" | "questions" | "review" | "metrics";

async function adminCall(method: "GET" | "POST", body?: unknown): Promise<{ data?: any; error?: string }> {
  if (!supabase) return { error: "Not available" };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "Sign in with the real admin account." };
  try {
    const res = await fetch("/api/admin/experience", {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const raw = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* non-JSON error page */
    }
    if (!res.ok) return { error: parsed?.error || `Request failed (${res.status})` };
    return { data: parsed };
  } catch {
    return { error: "Couldn't reach the server." };
  }
}

const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-[#e8ddd2] bg-white p-3">
      <p className="text-2xl font-bold text-[#1a0f0a]">{value}</p>
      <p className="text-xs text-[#a0704a]">{label}</p>
      {hint && <p className="text-[11px] text-[#6b6460] mt-1">{hint}</p>}
    </div>
  );
}

function ReasonTable({ title, data }: { title: string; data: Record<string, number> }) {
  const rows = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return null;
  return (
    <div>
      <p className="text-sm font-medium text-[#1a0f0a] mb-1">{title}</p>
      <table className="text-sm w-full">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-[#f3ede5]">
              <td className="py-1 text-[#6b6460]">{k.replace(/_/g, " ")}</td>
              <td className="py-1 text-right text-[#1a0f0a]">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Admin for "Your Experience Wanted": activation (after a dry run), pause,
// source policy and cadence, the seed bank, question moderation,
// exception queues, test emails and aggregate metrics.
export default function AdminExperiencePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("setup");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dryRun, setDryRun] = useState<any>(null);
  const [confirmActivate, setConfirmActivate] = useState(false);
  const [form, setForm] = useState<any>({});
  const [testTo, setTestTo] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "seed" | "member">("all");

  const load = useCallback(async () => {
    const r = await adminCall("GET");
    if (r.error) setError(r.error);
    else {
      setData(r.data);
      const s = r.data.settings;
      setForm({
        postBootstrapMode: s.post_bootstrap_mode,
        waveIntervalDays: s.wave_interval_days,
        staggerDays: s.stagger_days,
        perQuestionCap: s.per_question_cap,
        attributionDays: s.attribution_days,
        timezone: s.timezone,
        testRecipients: (s.test_recipients || []).join(", "),
      });
    }
  }, []);

  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }
      await load();
    })();
  }, [router, load]);

  const act = async (body: any, success?: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    const r = await adminCall("POST", body);
    setBusy(false);
    if (r.error) {
      setError(r.error);
      return null;
    }
    if (success) setNotice(success);
    await load();
    return r.data;
  };

  if (!data) {
    return error ? (
      <div className="p-6 text-red-700">{error}</div>
    ) : (
      <LoadingScreen message="Loading Your Experience Wanted" subtitle="Just a moment..." />
    );
  }

  const s = data.settings;
  const launched = !!s.launched_at;
  const status = !s.enabled ? (launched ? "Stopped" : "Not launched") : s.paused ? "Paused" : "Active";
  const questions = data.questions.filter((q: any) => filter === "all" || q.source === filter);
  const reviewItems = data.questions.filter(
    (q: any) => q.status === "open" && ((q.source === "member" && q.emailPermission && q.emailReview === "pending") || q.similarTo)
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Admin", href: "/app/admin" }, { label: "Your Experience Wanted" }]} />
      <div>
        <h1 className="text-3xl font-bold text-[#1a0f0a]">Your Experience Wanted</h1>
        <p className="text-[#a0704a] mt-1">
          Status: <strong>{status}</strong>
          {launched && <> · Launched {fmt(s.launched_at)} · Bootstrap until {fmt(s.bootstrap_ends_at)} ({s.phase === "bootstrap" ? "in bootstrap" : "after bootstrap"})</>}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["setup", "questions", "review", "metrics"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? "bg-[#d4a348] text-white" : "bg-[#f3ede5] text-[#a0704a]"}`}
          >
            {t === "setup" ? "Setup & status" : t === "questions" ? `Questions (${data.questions.length})` : t === "review" ? `Review (${reviewItems.length + data.queue.reports.length + data.queue.unknownDeliveries.length})` : "Metrics"}
          </button>
        ))}
      </div>

      {notice && <div className="bg-[#fdfaf5] border border-[#d4a348] rounded-lg p-3 text-sm text-[#1a0f0a]">{notice}</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      {tab === "setup" && (
        <div className="space-y-6">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-[#1a0f0a]">1. Seed bank</h2>
            <p className="text-sm text-[#6b6460]">
              {data.seeds.inFile} community prompts in the seed file · {data.seeds.toImport} not yet imported. Importing
              adds them as approved but unpublished; each gets a conversation only when it&apos;s first actually sent.
              Safe to run again.
            </p>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "import_seeds" }, "Seed bank imported.")}>
              Import / check seed bank
            </Button>
            {data.seeds.upstreamChanged.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#1a0f0a]">Wording changed in the seed file</p>
                {data.seeds.upstreamChanged.map((c: any) => (
                  <div key={c.questionId} className="rounded border border-[#e8ddd2] p-2 text-sm space-y-1">
                    <p className="text-[#6b6460]">Now: {c.currentText}</p>
                    <p className="text-[#1a0f0a]">File: {c.newText}</p>
                    {c.staffEdited ? (
                      <p className="text-xs text-[#a0704a]">Staff edited this question, so it isn&apos;t updated automatically.</p>
                    ) : (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "apply_seed_update", questionId: c.questionId }, "Updated.")}>
                        Apply the file&apos;s wording
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-[#1a0f0a]">2. Settings</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <label className="space-y-1">
                <span className="block font-medium text-[#1a0f0a]">After the 3-month bootstrap</span>
                <select value={form.postBootstrapMode} onChange={(e) => setForm({ ...form, postBootstrapMode: e.target.value })} className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg bg-white">
                  <option value="recycle_and_member">Recycle prompts used during bootstrap + member questions</option>
                  <option value="member_only">Member questions only</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="block font-medium text-[#1a0f0a]">Days between waves (14–21)</span>
                <input type="number" min={14} max={21} value={form.waveIntervalDays} onChange={(e) => setForm({ ...form, waveIntervalDays: e.target.value })} className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg" />
              </label>
              <label className="space-y-1">
                <span className="block font-medium text-[#1a0f0a]">Delivery spread (days, 1–7)</span>
                <input type="number" min={1} max={7} value={form.staggerDays} onChange={(e) => setForm({ ...form, staggerDays: e.target.value })} className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg" />
              </label>
              <label className="space-y-1">
                <span className="block font-medium text-[#1a0f0a]">Max recipients per question per wave</span>
                <input type="number" min={1} max={50} value={form.perQuestionCap} onChange={(e) => setForm({ ...form, perQuestionCap: e.target.value })} className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg" />
              </label>
              <label className="space-y-1">
                <span className="block font-medium text-[#1a0f0a]">Attribution window (days)</span>
                <input type="number" min={1} max={60} value={form.attributionDays} onChange={(e) => setForm({ ...form, attributionDays: e.target.value })} className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg" />
              </label>
              <label className="space-y-1">
                <span className="block font-medium text-[#1a0f0a]">Feature timezone {launched && "(locked)"}</span>
                <input disabled={launched} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg disabled:bg-[#f3ede5]" />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="block font-medium text-[#1a0f0a]">Test recipients (test emails go only to these)</span>
                <input value={form.testRecipients} onChange={(e) => setForm({ ...form, testRecipients: e.target.value })} placeholder="you@example.com" className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg" />
              </label>
            </div>
            <p className="text-xs text-[#6b6460]">
              Members always get at most one invitation per calendar month and at least 30 days apart, whatever the wave
              setting. Each member may skip waves; that&apos;s normal.
            </p>
            <Button
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() => {
                const { timezone, ...rest } = form;
                act({ action: "save_settings", settings: launched ? rest : form }, "Settings saved.");
              }}
            >
              Save settings
            </Button>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-[#1a0f0a]">3. Test email</h2>
            <p className="text-sm text-[#6b6460]">Sends a preview marked [TEST] to one of your test recipients. Never goes to members or counts as an invitation.</p>
            <div className="flex flex-wrap gap-2">
              <select value={testTo} onChange={(e) => setTestTo(e.target.value)} className="px-3 py-2 border border-[#e8ddd2] rounded-lg bg-white text-sm">
                <option value="">Choose a test recipient</option>
                {(s.test_recipients || []).map((e: string) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <Button size="sm" variant="outline" disabled={busy || !testTo} onClick={() => act({ action: "send_test", to: testTo }, "Test email sent.")}>
                Send test email
              </Button>
            </div>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-[#1a0f0a]">4. Dry run{launched ? "" : " and launch"}</h2>
            <p className="text-sm text-[#6b6460]">
              Shows exactly who a wave would invite right now, with which question and when, and why everyone else
              would be skipped. Nothing is sent or saved.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                const r = await act({ action: "dry_run" });
                if (r?.dryRun) setDryRun(r.dryRun);
              }}
            >
              {busy ? "Working..." : "Run dry run"}
            </Button>
            {dryRun && (
              <div className="space-y-3 border-t border-[#e8ddd2] pt-3">
                <p className="text-sm text-[#1a0f0a]">
                  {dryRun.planned} invitations planned from {dryRun.eligibleQuestions} eligible questions, across{" "}
                  {dryRun.members} members ({dryRun.phase === "bootstrap" ? "bootstrap rules" : "post-bootstrap rules"}).
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <ReasonTable title="Members skipped, by reason" data={dryRun.memberExclusions} />
                  <ReasonTable title="Questions not used, by reason" data={dryRun.questionExclusions} />
                </div>
                <details>
                  <summary className="text-sm text-[#8b6f47] cursor-pointer">Planned invitations ({dryRun.assignments.length})</summary>
                  <div className="max-h-80 overflow-y-auto mt-2 text-xs space-y-1">
                    {dryRun.assignments.map((a: any, i: number) => (
                      <div key={i} className="border-b border-[#f3ede5] py-1">
                        <strong>{a.member}</strong> · {fmt(a.dueAt)} · {a.source === "seed" ? "Community prompt" : "Member question"} · {a.question}
                      </div>
                    ))}
                  </div>
                </details>
                <details>
                  <summary className="text-sm text-[#8b6f47] cursor-pointer">Skipped members ({dryRun.excluded.length})</summary>
                  <div className="max-h-60 overflow-y-auto mt-2 text-xs space-y-1">
                    {dryRun.excluded.map((e: any, i: number) => (
                      <div key={i}>{e.member}: {e.reason.replace(/_/g, " ")}</div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {!s.enabled && dryRun && !confirmActivate && (
              <Button size="sm" variant="primary" disabled={busy} onClick={() => setConfirmActivate(true)}>
                {launched ? "Turn sending back on" : "Activate"}
              </Button>
            )}
            {confirmActivate && (
              <div className="rounded-lg border border-[#d4a348] bg-[#fdfaf5] p-3 space-y-2">
                <p className="text-sm text-[#1a0f0a]">
                  {launched
                    ? "Sending resumes on the next scheduler run. Limits and the launch date are unchanged."
                    : "This sets the launch date (locked from now on) and starts the 3-month bootstrap. The first wave is planned on the next scheduler run, and invitations go out spread over the following days."}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" disabled={busy} onClick={async () => { setConfirmActivate(false); await act({ action: "activate", confirm: true }, "Activated."); }}>
                    Yes, activate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmActivate(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </Card>

          {s.enabled && (
            <Card className="space-y-2">
              <h2 className="text-lg font-semibold text-[#1a0f0a]">Sending</h2>
              <p className="text-sm text-[#6b6460]">
                {s.paused
                  ? "Paused: nothing is sent and no waves start. Scheduled invitations expire if their delivery window passes while paused."
                  : `Active. Next wave: ${s.nextWaveAt && s.nextWaveAt !== "next scheduler run" ? fmt(s.nextWaveAt) : "on the next scheduler run"}. ${data.pending} invitations scheduled.`}
              </p>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: s.paused ? "resume" : "pause" }, s.paused ? "Resumed." : "Paused.")}>
                {s.paused ? "Resume" : "Pause"}
              </Button>
              {data.waves.length > 0 && (
                <div className="text-xs text-[#6b6460] space-y-1 pt-2">
                  {data.waves.map((w: any) => (
                    <div key={w.id}>
                      {fmt(w.startsAt)} · {w.phase} · {w.summary?.planned ?? 0} planned
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {tab === "questions" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["all", "seed", "member"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full text-xs ${filter === f ? "bg-[#d4a348] text-white" : "bg-[#f3ede5] text-[#a0704a]"}`}>
                {f === "all" ? "All" : f === "seed" ? "Community prompts" : "Member questions"}
              </button>
            ))}
          </div>
          {questions.map((q: any) => (
            <Card key={q.id} className="space-y-2">
              <div className="flex flex-wrap gap-2 text-xs text-[#a0704a]">
                <span className="font-semibold uppercase">{q.source === "seed" ? "Community prompt" : "Member question"}</span>
                <span>· {q.topic}</span>
                <span>· {q.status}</span>
                {q.source === "member" && <span>· asked by {q.authorName}{q.anonymous ? " (anonymous to members)" : ""}</span>}
                <span>· email: {q.source === "member" && !q.emailPermission ? "author hasn't allowed" : q.emailReview}</span>
                <span>· {q.hasThread ? `live, ${q.responses} responses` : "not yet published"}</span>
                <span>· {q.invitationsSent} sent</span>
              </div>
              {editing && editing.id === q.id ? (
                <div className="space-y-2">
                  <input value={editing.text} onChange={(e) => setEditing({ id: q.id, text: e.target.value })} className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" disabled={busy} onClick={async () => { await act({ action: "update_question", questionId: q.id, patch: { text: editing?.text } }, "Saved."); setEditing(null); }}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="text-[#1a0f0a]">{q.text}</p>
              )}
              {q.context && <p className="text-xs text-[#6b6460]">Context (in-app only): {q.context}</p>}
              <div className="flex flex-wrap gap-3 text-xs">
                <button className="text-[#8b6f47] underline" onClick={() => setEditing({ id: q.id, text: q.text })}>Edit wording</button>
                {q.status === "open" ? (
                  <button className="text-[#8b6f47] underline" onClick={() => act({ action: "update_question", questionId: q.id, patch: { status: "closed" } }, "Closed.")}>Close</button>
                ) : (
                  <button className="text-[#8b6f47] underline" onClick={() => act({ action: "update_question", questionId: q.id, patch: { status: "open" } }, "Reopened.")}>Reopen</button>
                )}
                {q.status !== "removed" && (
                  <button className="text-[#8b6f47] underline" onClick={() => act({ action: "update_question", questionId: q.id, patch: { status: "removed" } }, "Removed.")}>Remove</button>
                )}
                {q.emailReview !== "approved" && (q.source === "seed" || q.emailPermission) && (
                  <button className="text-[#8b6f47] underline" onClick={() => act({ action: "update_question", questionId: q.id, patch: { emailReview: "approved" } }, "Approved for email.")}>Approve for email</button>
                )}
                {q.emailReview === "approved" && (
                  <button className="text-[#8b6f47] underline" onClick={() => act({ action: "update_question", questionId: q.id, patch: { emailReview: "rejected" } }, "Excluded from email.")}>Stop emailing</button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "review" && (
        <div className="space-y-6">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-[#1a0f0a]">Member questions to review for email</h2>
            <p className="text-xs text-[#6b6460]">
              Only questions whose authors asked to include them in emails, plus any that look like an existing question.
              Everything else is already live in the app with no action needed.
            </p>
            {reviewItems.length === 0 && <p className="text-sm text-[#6b6460]">Nothing to review.</p>}
            {reviewItems.map((q: any) => (
              <div key={q.id} className="rounded border border-[#e8ddd2] p-3 space-y-2">
                <p className="text-[#1a0f0a]">{q.text}</p>
                <p className="text-xs text-[#a0704a]">
                  {q.authorName}{q.anonymous ? " (anonymous to members)" : ""} · {q.topic}
                  {q.similarTo && <> · looks like: &ldquo;{q.similarTo}&rdquo;</>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {q.emailPermission && q.emailReview === "pending" && (
                    <>
                      <Button size="sm" variant="primary" disabled={busy} onClick={() => act({ action: "update_question", questionId: q.id, patch: { emailReview: "approved" } }, "Approved for email.")}>Approve for email</Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "update_question", questionId: q.id, patch: { emailReview: "rejected" } }, "Kept in-app only.")}>Keep in-app only</Button>
                    </>
                  )}
                  {q.similarTo && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "update_question", questionId: q.id, patch: { clearSimilarFlag: true } }, "Marked as distinct.")}>It&apos;s a different question</Button>
                  )}
                </div>
              </div>
            ))}
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-[#1a0f0a]">Reports</h2>
            {data.queue.reports.length === 0 && <p className="text-sm text-[#6b6460]">No open reports.</p>}
            {data.queue.reports.map((r: any) => (
              <div key={r.id} className="rounded border border-[#e8ddd2] p-3 space-y-1 text-sm">
                <p className="text-[#1a0f0a]">&ldquo;{r.reason}&rdquo;</p>
                <p className="text-xs text-[#a0704a]">
                  On {r.onComment ? "a response to" : "the question"} &ldquo;{r.questionText}&rdquo; · written by {r.reportedName} · reported by {r.reporterName} · {fmt(r.createdAt)}
                </p>
                <p className="text-xs text-[#6b6460]">A question with an open report isn&apos;t emailed. Remove content from the Questions tab or Moderation page if needed.</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "resolve_report", reportId: r.id, status: "resolved" }, "Resolved.")}>Resolved</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "resolve_report", reportId: r.id, status: "dismissed" }, "Dismissed.")}>Dismiss</Button>
                </div>
              </div>
            ))}
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-[#1a0f0a]">Deliveries to check</h2>
            <p className="text-xs text-[#6b6460]">
              The mail server didn&apos;t confirm these clearly (e.g. a timeout). They count toward the member&apos;s
              monthly limit and are never resent automatically. Check SMTP2GO&apos;s activity log, then record what
              happened.
            </p>
            {data.queue.unknownDeliveries.length === 0 && <p className="text-sm text-[#6b6460]">Nothing to check.</p>}
            {data.queue.unknownDeliveries.map((u: any) => (
              <div key={u.id} className="rounded border border-[#e8ddd2] p-3 text-sm space-y-1">
                <p>{u.memberName} · attempted {fmt(u.claimedAt)}</p>
                {u.error && <p className="text-xs text-[#6b6460]">{u.error}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "resolve_invitation", invitationId: u.id, outcome: "sent" }, "Recorded as sent.")}>It was delivered</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "resolve_invitation", invitationId: u.id, outcome: "not_sent" }, "Recorded as not sent.")}>It wasn&apos;t sent</Button>
                </div>
              </div>
            ))}
            {data.queue.failures.length > 0 && (
              <details>
                <summary className="text-sm text-[#8b6f47] cursor-pointer">Delivery failures ({data.queue.failures.length})</summary>
                <div className="text-xs space-y-1 mt-2">
                  {data.queue.failures.map((f: any) => (
                    <div key={f.id}>{f.memberName}: {f.error} ({f.attempts} attempts)</div>
                  ))}
                </div>
              </details>
            )}
          </Card>
        </div>
      )}

      {tab === "metrics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Invitations accepted by the mail server" value={data.metrics.acceptedInvitations} />
            <Stat label="Unique link visits" value={data.metrics.uniqueLinkVisits} hint="Email security scanners can add a few." />
            <Stat
              label={`Responded within ${data.metrics.attributionDays} days`}
              value={`${data.metrics.invitationsWithResponseInWindow} (${Math.round(data.metrics.conversionRate * 100)}%)`}
              hint="Invitations whose recipient responded to that question in the window. Later activity isn't credited to the email."
            />
            <Stat label="Responses in the app" value={data.metrics.initialResponses} />
            <Stat label="Replies to other members" value={data.metrics.repliesByOtherMembers} />
            <Stat label="Unique contributors" value={data.metrics.uniqueContributors} />
            <Stat label="Contributed to 2+ questions" value={data.metrics.returningContributors} />
            <Stat label="Unsubscribed from invitations" value={data.metrics.optOuts} />
            <Stat label="Spam complaints" value={data.metrics.complaints} />
            <Stat label="Delivery failures" value={data.metrics.deliveryFailures} />
            <Stat label="Deliveries to check" value={data.metrics.awaitingReview} />
          </div>
          <p className="text-xs text-[#6b6460]">Counts only. Email opens aren&apos;t tracked for this feature.</p>
        </div>
      )}
    </div>
  );
}
