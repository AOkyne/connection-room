"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/Card";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";
import { CATEGORY_LABELS, SLOT_LABELS, type PromptCategory, type PromptSlot } from "@/lib/lento/prompt-labels";

// Lento Room admin: overview (aggregates only), schedule, moderation, the
// prompt bank and privacy-conscious entry diagnostics. Confirmations are
// in-page (Safari's native confirm is unreliable).

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOT_ORDER: PromptSlot[] = ["weekly", "midweek", "learning"];

const OUTCOME_LABELS: Record<string, string> = {
  ok_lento: "Entered (Lento Room)",
  ok_connection_lento: "Entered (Lento Room, Connection Room also allowed)",
  ok_connection: "Sent to The Connection Room's sign-in",
  missing: "Link opened without a pass",
  invalid: "Pass not valid",
  expired: "Pass expired before use",
  replayed: "Pass used twice",
  misconfigured: "Room not configured",
};

interface Data {
  settings: { paused: boolean; timezone: string; schedule: Record<PromptSlot, { day: number; hour: number; enabled: boolean }> };
  overview: Record<string, number>;
  prompts: Array<{ id: string; slot: PromptSlot; category: PromptCategory; body: string; enabled: boolean; timesPublished: number; lastPublishedAt: string | null }>;
  history: Array<{ id: string; slot: PromptSlot; manual: boolean; publishedAt: string; body: string; replies: number }>;
  reports: Array<{ id: string; reason: string; createdAt: string; messageId: string | null; messageBody: string; messageRemoved: boolean; authorId: string | null; authorName: string; reporterName: string }>;
  recent: Array<{ id: string; kind: string; isReply: boolean; body: string; createdAt: string; removed: boolean; authorId: string | null; authorName: string; isHost: boolean }>;
  restricted: Array<{ id: string; name: string; since: string }>;
  diagnostics: { passKeyConfigured: boolean; sessionSecretConfigured: boolean; notifySecretConfigured: boolean; entriesLast7Days: Record<string, number> };
  categories: PromptCategory[];
}

async function call(body?: unknown) {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = data.session?.access_token;
  const res = await fetch("/api/admin/lento-room", {
    method: body ? "POST" : "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const raw = await res.text();
  try {
    return { ok: res.ok, data: JSON.parse(raw) };
  } catch {
    return { ok: false, data: { error: "The server sent an unexpected response." } };
  }
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "never";

export default function AdminLentoRoomPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [draft, setDraft] = useState<{ slot: PromptSlot; category: PromptCategory; body: string }>({
    slot: "weekly",
    category: "intimacy-connection",
    body: "",
  });

  const load = useCallback(async () => {
    const res = await call();
    if (!res.ok) setError(res.data.error || "Could not load.");
    else setData(res.data);
  }, []);

  useEffect(() => {
    const init = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }
      await load();
    };
    init();
  }, [router, load]);

  const act = async (body: Record<string, unknown>) => {
    setError("");
    setConfirm(null);
    const res = await call(body);
    if (!res.ok) setError(res.data.error || "That didn’t work.");
    await load();
  };

  if (!data) return error ? <p className="text-red-700">{error}</p> : <LoadingScreen message="Loading the Lento Room" subtitle="Just a moment..." />;

  const o = data.overview;
  const stats: Array<[string, number]> = [
    ["Entered in the last 30 days", o.enteredLast30Days],
    ["Members with a room name", o.membersWithName],
    ["People who posted (30 days)", o.activeParticipants30Days],
    ["Conversations", o.conversations],
    ["Messages (7 days)", o.messagesLast7Days],
    ["Prompts with no replies yet", o.unansweredPrompts],
    ["Open reports", o.openReports],
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Admin", href: "/app/admin" }, { label: "Lento Room" }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[#1a0f0a]">The Lento Room</h1>
          <p className="text-[#a0704a] mt-1">The private room for Lento members with the Complete Program plus the $12.99 membership, and people who finished all twelve seasons.</p>
        </div>
        <Link href="/lento-room" target="_blank" className="px-4 py-2 rounded-lg bg-[#1a0f0a] text-white text-sm font-semibold">
          Open the room as host
        </Link>
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(([label, n]) => (
          <Card key={label}>
            <p className="text-2xl font-bold text-[#1a0f0a]">{n}</p>
            <p className="text-xs text-[#a0704a] mt-1">{label}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#1a0f0a]">Prompt schedule</h2>
          <button
            type="button"
            onClick={() => act({ action: "settings", paused: !data.settings.paused })}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${data.settings.paused ? "bg-[#d4a348] text-white" : "border border-[#e8ddd2]"}`}
          >
            {data.settings.paused ? "Paused · Resume prompts" : "Pause prompts"}
          </button>
        </div>
        <p className="text-sm text-[#a0704a]">Times are Los Angeles time. Each slot posts once on its day.</p>
        <div className="space-y-2">
          {SLOT_ORDER.map((slot) => {
            const s = data.settings.schedule[slot];
            const set = (patch: Partial<typeof s>) =>
              act({ action: "settings", schedule: { ...data.settings.schedule, [slot]: { ...s, ...patch } } });
            return (
              <div key={slot} className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-2 w-56">
                  <input type="checkbox" checked={s.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
                  <span className="font-medium text-[#1a0f0a]">{SLOT_LABELS[slot]}</span>
                </label>
                <select value={s.day} onChange={(e) => set({ day: Number(e.target.value) })} className="rounded border border-[#e8ddd2] px-2 py-1">
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
                <select value={s.hour} onChange={(e) => set({ hour: Number(e.target.value) })} className="rounded border border-[#e8ddd2] px-2 py-1">
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {new Date(2000, 0, 1, h).toLocaleTimeString("en-US", { hour: "numeric" })}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-[#1a0f0a]">Reports</h2>
        {data.reports.length === 0 && <p className="text-sm text-[#a0704a]">No open reports.</p>}
        {data.reports.map((r) => (
          <div key={r.id} className="rounded-lg border border-[#e8ddd2] p-3 space-y-2 text-sm">
            <p className="text-[#a0704a]">
              {r.reporterName} reported a message by <strong className="text-[#1a0f0a]">{r.authorName}</strong> · {fmt(r.createdAt)}
            </p>
            <p className="whitespace-pre-wrap text-[#1a0f0a] bg-[#faf6f1] rounded p-2">{r.messageBody || "(empty)"}</p>
            {r.reason && <p className="text-[#1a0f0a]">Reason: {r.reason}</p>}
            {confirm === `report:${r.id}` ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => act({ action: "remove_message", id: r.messageId, reportId: r.id })} className="px-3 py-1 rounded bg-[#1a0f0a] text-white">
                  Remove message
                </button>
                {r.authorId && (
                  <button type="button" onClick={() => act({ action: "restrict", memberId: r.authorId, reportId: r.id })} className="px-3 py-1 rounded bg-red-700 text-white">
                    Remove message’s author from the room
                  </button>
                )}
                <button type="button" onClick={() => act({ action: "dismiss_report", reportId: r.id })} className="px-3 py-1 rounded border border-[#e8ddd2]">
                  No action needed
                </button>
                <button type="button" onClick={() => setConfirm(null)} className="px-3 py-1 underline">
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirm(`report:${r.id}`)} className="px-3 py-1 rounded border border-[#e8ddd2]">
                Decide…
              </button>
            )}
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-[#1a0f0a]">Recent messages</h2>
        {data.recent.length === 0 && <p className="text-sm text-[#a0704a]">Nothing posted yet.</p>}
        <ul className="divide-y divide-[#f0e8df] text-sm">
          {data.recent.map((m) => (
            <li key={m.id} className="py-2 space-y-1">
              <p className="text-[#a0704a]">
                <strong className="text-[#1a0f0a]">{m.authorName}</strong>
                {m.isHost && " (host)"} · {m.isReply ? "reply" : m.kind === "checkin" ? "check-in" : m.kind === "question" ? "asked the room" : "message"} · {fmt(m.createdAt)}
                {m.removed && " · removed"}
              </p>
              <p className={`whitespace-pre-wrap ${m.removed ? "line-through text-[#a0704a]" : "text-[#1a0f0a]"}`}>{m.body}</p>
              <div className="flex gap-3 text-xs">
                {m.removed ? (
                  <button type="button" onClick={() => act({ action: "restore_message", id: m.id })} className="underline text-[#8b6f47]">
                    Put back
                  </button>
                ) : confirm === `rm:${m.id}` ? (
                  <>
                    <button type="button" onClick={() => act({ action: "remove_message", id: m.id })} className="underline text-red-700">
                      Yes, remove
                    </button>
                    <button type="button" onClick={() => setConfirm(null)} className="underline">
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirm(`rm:${m.id}`)} className="underline text-[#8b6f47]">
                    Remove…
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {data.restricted.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-lg font-semibold text-[#1a0f0a]">Removed from the room</h2>
          {data.restricted.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <span>
                {m.name} · since {fmt(m.since)}
              </span>
              <button type="button" onClick={() => act({ action: "unrestrict", memberId: m.id })} className="underline text-[#8b6f47]">
                Let back in
              </button>
            </div>
          ))}
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-[#1a0f0a]">Prompts</h2>
        <div className="rounded-lg bg-[#faf6f1] p-3 space-y-2">
          <p className="text-sm font-medium text-[#1a0f0a]">Add a prompt</p>
          <textarea
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            rows={2}
            className="w-full rounded border border-[#e8ddd2] px-2 py-1.5 text-sm"
            placeholder="A question for the room"
          />
          <div className="flex flex-wrap gap-2 text-sm">
            <select value={draft.slot} onChange={(e) => setDraft({ ...draft, slot: e.target.value as PromptSlot })} className="rounded border border-[#e8ddd2] px-2 py-1">
              {SLOT_ORDER.map((s) => (
                <option key={s} value={s}>
                  {SLOT_LABELS[s]}
                </option>
              ))}
            </select>
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as PromptCategory })} className="rounded border border-[#e8ddd2] px-2 py-1">
              {data.categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!draft.body.trim()}
              onClick={async () => {
                await act({ action: "prompt_create", ...draft });
                setDraft({ ...draft, body: "" });
              }}
              className="px-3 py-1 rounded bg-[#1a0f0a] text-white disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
        {SLOT_ORDER.map((slot) => (
          <div key={slot} className="space-y-1">
            <h3 className="font-semibold text-[#1a0f0a] text-sm">{SLOT_LABELS[slot]}</h3>
            <ul className="divide-y divide-[#f0e8df] text-sm">
              {data.prompts
                .filter((p) => p.slot === slot)
                .map((p) => (
                  <li key={p.id} className="py-2 space-y-1">
                    {editing?.id === p.id ? (
                      <div className="space-y-1">
                        <textarea
                          value={editing.body}
                          onChange={(e) => setEditing({ id: p.id, body: e.target.value })}
                          rows={2}
                          className="w-full rounded border border-[#e8ddd2] px-2 py-1.5"
                        />
                        <div className="flex gap-2 text-xs">
                          <button type="button" onClick={async () => { await act({ action: "prompt_update", id: p.id, body: editing.body }); setEditing(null); }} className="px-2 py-1 rounded bg-[#1a0f0a] text-white">
                            Save
                          </button>
                          <button type="button" onClick={() => setEditing(null)} className="underline">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={p.enabled ? "text-[#1a0f0a]" : "text-[#a0704a] line-through"}>{p.body}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#a0704a]">
                      <span>{CATEGORY_LABELS[p.category] || p.category}</span>
                      <span>Used {p.timesPublished}× · last {fmt(p.lastPublishedAt)}</span>
                      <button type="button" onClick={() => setEditing({ id: p.id, body: p.body })} className="underline">
                        Edit
                      </button>
                      <button type="button" onClick={() => act({ action: "prompt_update", id: p.id, enabled: !p.enabled })} className="underline">
                        {p.enabled ? "Turn off" : "Turn on"}
                      </button>
                      {confirm === `pub:${p.id}` ? (
                        <>
                          <button type="button" onClick={() => act({ action: "publish_now", id: p.id })} className="underline text-[#1a0f0a] font-semibold">
                            Post it now
                          </button>
                          <button type="button" onClick={() => setConfirm(null)} className="underline">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setConfirm(`pub:${p.id}`)} className="underline">
                          Post now…
                        </button>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-semibold text-[#1a0f0a]">Published prompts</h2>
        {data.history.length === 0 && <p className="text-sm text-[#a0704a]">None yet.</p>}
        <ul className="divide-y divide-[#f0e8df] text-sm">
          {data.history.map((h) => (
            <li key={h.id} className="py-2">
              <p className="text-[#1a0f0a]">{h.body}</p>
              <p className="text-xs text-[#a0704a]">
                {SLOT_LABELS[h.slot]} · {fmt(h.publishedAt)}
                {h.manual && " · posted by hand"} · {h.replies} {h.replies === 1 ? "reply" : "replies"}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-2 text-sm">
        <h2 className="text-lg font-semibold text-[#1a0f0a]">Entry diagnostics</h2>
        <p className="text-[#a0704a]">Counts only. No passes, ids or personal details are kept.</p>
        <ul className="space-y-1">
          <li>Lento’s public key: {data.diagnostics.passKeyConfigured ? "set ✓" : "not set (nobody can enter yet)"}</li>
          <li>Room session secret: {data.diagnostics.sessionSecretConfigured ? "set ✓" : "not set (nobody can enter yet)"}</li>
          <li>Lento email connection: {data.diagnostics.notifySecretConfigured ? "set ✓" : "not set (no room emails yet)"}</li>
        </ul>
        <p className="font-medium text-[#1a0f0a] pt-2">Entries in the last 7 days</p>
        {Object.keys(data.diagnostics.entriesLast7Days).length === 0 ? (
          <p className="text-[#a0704a]">None.</p>
        ) : (
          <ul className="space-y-0.5">
            {Object.entries(data.diagnostics.entriesLast7Days).map(([k, n]) => (
              <li key={k}>
                {OUTCOME_LABELS[k] || k}: {n}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
