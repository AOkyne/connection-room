"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { AutoGrowTextarea } from "@/components/AutoGrowTextarea";
import type { PublicMessage } from "@/lib/lento/room";
import {
  AGREEMENTS,
  AGREEMENTS_INTRO,
  CHECKIN_VISIBILITY,
  LENTO_ROOM_REFUSAL,
  NOT_ALLOWED,
  NOTIFY_EXPLAINER,
  ROOM_CAVEATS,
  WELCOME_PARAGRAPHS,
} from "@/lib/lento/copy";

// The Lento Room: one warm, asynchronous conversation. Open messages,
// optional check-ins and gentle prompts share a single stream; any of them
// can grow a thread of replies. New messages are fetched every 20 seconds
// while the page is visible (no typing indicators, online counts or
// streaks, by design). Every request is authorized on the server; this
// component only shows what /api/lento-room returns.

const C = {
  chocolate: "#412f26",
  gold: "#ffb400",
  ivory: "#f7f1e8",
  card: "#fdfaf5",
  ink: "#2e211b",
  muted: "#5f4c40",
  hairline: "#e1d5c4",
  caramel: "#eadcc4",
};

const MOODS = [
  { id: "in-my-head", label: "In my head" },
  { id: "anxious", label: "Feeling anxious" },
  { id: "hopeful", label: "Hopeful" },
  { id: "grounded", label: "More grounded" },
  { id: "listening", label: "Just listening" },
];
const MOOD_LABEL = Object.fromEntries(MOODS.map((m) => [m.id, m.label]));

const REACTIONS = [
  { id: "relate", label: "I relate" },
  { id: "thanks", label: "Thank you for sharing" },
  { id: "with_you", label: "I’m with you" },
] as const;

const SLOT_LABEL: Record<string, string> = {
  weekly: "The Weekly Conversation",
  midweek: "Midweek Check-In",
  learning: "Something I’m Learning",
};

const POLL_MS = 20_000;

interface Me {
  displayName: string | null;
  welcomed: boolean;
  isHost: boolean;
  via: "lento" | "host";
  lastReadAt: string | null;
  prefs: { replies: boolean; followed: boolean; topics: boolean; digest: boolean };
}

type Fetcher = <T>(url: string, init?: { method?: string; body?: unknown }) => Promise<{ ok: boolean; status: number; data: T }>;

function useFetcher(host: boolean): Fetcher {
  return useCallback(
    async <T,>(url: string, init: { method?: string; body?: unknown } = {}) => {
      const headers: Record<string, string> = {};
      if (init.body !== undefined) headers["Content-Type"] = "application/json";
      if (host && supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
      }
      const res = await fetch(url, {
        method: init.method || (init.body !== undefined ? "POST" : "GET"),
        headers,
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        credentials: "same-origin",
        cache: "no-store",
      });
      const raw = await res.text();
      let data: T;
      try {
        data = JSON.parse(raw) as T;
      } catch {
        data = { error: "Something went wrong. Please try again." } as T;
      }
      return { ok: res.ok, status: res.status, data };
    },
    [host]
  );
}

function when(iso: string) {
  const d = new Date(iso);
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
        " · " +
        d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function todayKey() {
  return `lento-room:checkin-dismissed:${new Date().toDateString()}`;
}

export function LentoRoom({ host = false }: { host?: boolean }) {
  const api = useFetcher(host);
  const [me, setMe] = useState<Me | null>(null);
  const [blocked, setBlocked] = useState<"no_session" | "restricted" | null>(null);
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [firstUnreadAt, setFirstUnreadAt] = useState<string | null>(null);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [panel, setPanel] = useState<null | "agreements" | "notifications">(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const merge = useCallback((incoming: PublicMessage[], mode: "replace" | "older" | "newer") => {
    setMessages((prev) => {
      if (mode === "replace") return incoming;
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, m);
      return [...map.values()].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    });
  }, []);

  const loadLatest = useCallback(
    async (mode: "replace" | "newer") => {
      const res = await api<{ messages?: PublicMessage[]; hasMore?: boolean; error?: string }>("/api/lento-room/messages");
      if (res.status === 401) return setBlocked("no_session");
      if (res.status === 403) return setBlocked("restricted");
      if (!res.ok || !res.data.messages) return;
      merge(res.data.messages, mode);
      if (mode === "replace") setHasMore(!!res.data.hasMore);
    },
    [api, merge]
  );

  useEffect(() => {
    const init = async () => {
      const res = await api<{ me?: Me; error?: string }>("/api/lento-room/me");
      if (res.status === 401) return setBlocked("no_session");
      if (res.status === 403) return setBlocked("restricted");
      if (!res.data.me) return setError(res.data.error || "The room couldn’t load.");
      setMe(res.data.me);
      if (res.data.me.welcomed) {
        setFirstUnreadAt(res.data.me.lastReadAt);
        await loadLatest("replace");
        api("/api/lento-room/me", { body: { action: "read" } });
        setTimeout(() => bottomRef.current?.scrollIntoView({ block: "end" }), 50);
      }
    };
    init();
  }, [api, loadLatest]);

  // Gentle refresh while the page is open and visible.
  useEffect(() => {
    if (!me?.welcomed) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") loadLatest("newer");
    }, POLL_MS);
    return () => clearInterval(t);
  }, [me?.welcomed, loadLatest]);

  const loadOlder = async () => {
    const oldest = messages[0]?.createdAt;
    const res = await api<{ messages?: PublicMessage[]; hasMore?: boolean }>(
      `/api/lento-room/messages?before=${encodeURIComponent(oldest || "")}`
    );
    if (res.ok && res.data.messages) {
      merge(res.data.messages, "older");
      setHasMore(!!res.data.hasMore);
    }
  };

  if (blocked === "no_session") return <NoAccess />;
  if (blocked === "restricted") {
    return (
      <Frame>
        <p style={{ color: C.muted }}>
          Your access to the Lento Room is paused. If you think this is a mistake, write to support@trevorjamesla.com.
        </p>
      </Frame>
    );
  }
  if (error) return <Frame><p style={{ color: C.muted }}>{error}</p></Frame>;
  if (!me) return <Frame><p style={{ color: C.muted }}>Opening the room…</p></Frame>;
  if (!me.welcomed) {
    return (
      <Welcome
        api={api}
        suggested={me.displayName}
        onDone={async (updated) => {
          setMe(updated);
          await loadLatest("replace");
          api("/api/lento-room/me", { body: { action: "read" } });
          setTimeout(() => bottomRef.current?.scrollIntoView({ block: "end" }), 50);
        }}
      />
    );
  }

  const unreadIndex = firstUnreadAt
    ? messages.findIndex((m) => m.createdAt > firstUnreadAt && !m.isMine)
    : -1;

  return (
    <div className="min-h-dvh" style={{ background: C.ivory, color: C.ink }}>
      <header className="sticky top-0 z-20 border-b" style={{ background: C.chocolate, borderColor: C.chocolate }}>
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: C.ivory, fontFamily: "var(--font-serif)" }}>
              The Lento Room
            </h1>
            <p className="text-xs" style={{ color: C.caramel }}>
              You’re here as {me.displayName}
              {me.isHost ? " · Host" : ""}
            </p>
          </div>
          <div className="flex gap-1 text-sm">
            <button type="button" onClick={() => setPanel(panel === "agreements" ? null : "agreements")} className="px-2.5 py-1.5 rounded" style={{ color: C.ivory }}>
              Agreements
            </button>
            {me.via === "lento" && (
              <button type="button" onClick={() => setPanel(panel === "notifications" ? null : "notifications")} className="px-2.5 py-1.5 rounded" style={{ color: C.ivory }}>
                Emails
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-48 pt-4 space-y-3">
        {panel === "agreements" && (
          <Card>
            <AgreementsText />
            <button type="button" onClick={() => setPanel(null)} className="mt-3 text-sm underline" style={{ color: C.muted }}>
              Close
            </button>
          </Card>
        )}
        {panel === "notifications" && <NotificationPrefs api={api} me={me} onSaved={setMe} onClose={() => setPanel(null)} />}

        <CheckIn api={api} onPosted={() => loadLatest("newer")} />

        {hasMore && (
          <div className="text-center">
            <button type="button" onClick={loadOlder} className="text-sm underline" style={{ color: C.muted }}>
              Read earlier conversations
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <Card>
            <p style={{ color: C.muted }}>
              It’s quiet in here so far. You’re welcome to start the conversation, or simply come back later.
            </p>
          </Card>
        )}

        {messages.map((m, i) => (
          <div key={m.id}>
            {i === unreadIndex && (
              <div className="flex items-center gap-3 my-2 text-xs" style={{ color: C.muted }}>
                <span className="flex-1 h-px" style={{ background: C.hairline }} />
                New since your last visit
                <span className="flex-1 h-px" style={{ background: C.hairline }} />
              </div>
            )}
            <MessageCard
              api={api}
              message={m}
              open={openThread === m.id}
              onToggleThread={() => setOpenThread(openThread === m.id ? null : m.id)}
              onChanged={() => loadLatest("newer")}
            />
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      <Composer
        api={api}
        onPosted={async () => {
          await loadLatest("newer");
          setTimeout(() => bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }), 50);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- pieces

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4" style={{ background: C.ivory, color: C.ink }}>
      <div className="max-w-md w-full rounded-2xl border p-6 space-y-4" style={{ background: C.card, borderColor: C.hairline }}>
        {children}
      </div>
    </div>
  );
}

function Card({ children, tone = "card" }: { children: React.ReactNode; tone?: "card" | "prompt" }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: tone === "prompt" ? C.caramel : C.card, borderColor: tone === "prompt" ? C.caramel : C.hairline }}
    >
      {children}
    </div>
  );
}

export function NoAccess() {
  return (
    <Frame>
      <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: C.chocolate }}>
        The Lento Room
      </h1>
      <p style={{ color: C.muted }}>{LENTO_ROOM_REFUSAL}</p>
      <a
        href="https://lento.trevorjamesla.com/app/"
        className="inline-block rounded-full px-5 py-2.5 font-semibold"
        style={{ background: C.gold, color: C.chocolate }}
      >
        Open Lento
      </a>
    </Frame>
  );
}

function AgreementsText() {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      <p>{AGREEMENTS_INTRO}</p>
      <ul className="list-disc pl-5 space-y-1">
        {AGREEMENTS.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      <p>Not welcome here:</p>
      <ul className="list-disc pl-5 space-y-1">
        {NOT_ALLOWED.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      {ROOM_CAVEATS.map((c) => (
        <p key={c} style={{ color: C.muted }}>
          {c}
        </p>
      ))}
    </div>
  );
}

function Welcome({ api, suggested, onDone }: { api: Fetcher; suggested: string | null; onDone: (me: Me) => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState(suggested || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const finish = async () => {
    setBusy(true);
    setError("");
    const res = await api<{ me?: Me; error?: string }>("/api/lento-room/me", { body: { action: "welcome", displayName: name } });
    setBusy(false);
    if (!res.ok || !res.data.me) return setError(res.data.error || "Please try again.");
    onDone(res.data.me);
  };

  return (
    <Frame>
      {step === 0 && (
        <>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: C.chocolate }}>
            Welcome to the Lento Room
          </h1>
          <div className="space-y-3 leading-relaxed">
            {WELCOME_PARAGRAPHS.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <button type="button" onClick={() => setStep(1)} className="rounded-full px-5 py-2.5 font-semibold" style={{ background: C.gold, color: C.chocolate }}>
            Continue
          </button>
        </>
      )}
      {step === 1 && (
        <>
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: C.chocolate }}>
            How we look after this room
          </h2>
          <AgreementsText />
          <label className="flex items-start gap-2 text-[15px]">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
            <span>I’ll help look after this room.</span>
          </label>
          <button
            type="button"
            disabled={!agreed}
            onClick={() => setStep(2)}
            className="rounded-full px-5 py-2.5 font-semibold disabled:opacity-40"
            style={{ background: C.gold, color: C.chocolate }}
          >
            Continue
          </button>
        </>
      )}
      {step === 2 && (
        <>
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: C.chocolate }}>
            What should we call you here?
          </h2>
          <p style={{ color: C.muted }}>
            This is how others in the room will see you. It doesn’t need to be your real name, and you can use something
            different from anywhere else.
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="w-full rounded-xl border px-3 py-2.5"
            style={{ borderColor: C.hairline, background: "#fff" }}
            placeholder="A first name or nickname"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="button"
            disabled={busy || name.trim().length < 2}
            onClick={finish}
            className="rounded-full px-5 py-2.5 font-semibold disabled:opacity-40"
            style={{ background: C.gold, color: C.chocolate }}
          >
            {busy ? "Opening…" : "Enter the room"}
          </button>
        </>
      )}
    </Frame>
  );
}

function CheckIn({ api, onPosted }: { api: Fetcher; onPosted: () => void }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(todayKey()) === "1";
    } catch {
      return false;
    }
  });
  const [mood, setMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(todayKey(), "1");
    } catch {
      // storage unavailable: it simply shows again next visit
    }
    setHidden(true);
  };

  const post = async () => {
    setBusy(true);
    setError("");
    const res = await api<{ error?: string }>("/api/lento-room/messages", { body: { kind: "checkin", mood, body: note } });
    setBusy(false);
    if (!res.ok) return setError(res.data.error || "Please try again.");
    dismiss();
    onPosted();
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold" style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: C.chocolate }}>
          How are you arriving today?
        </p>
        <button type="button" onClick={dismiss} className="text-sm" style={{ color: C.muted }} aria-label="Not today">
          Not today
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {MOODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMood(mood === m.id ? null : m.id)}
            className="rounded-full border px-3 py-1.5 text-sm"
            style={{
              borderColor: mood === m.id ? C.chocolate : C.hairline,
              background: mood === m.id ? C.chocolate : "#fff",
              color: mood === m.id ? C.ivory : C.ink,
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mood && (
        <div className="mt-3 space-y-2">
          <AutoGrowTextarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Anything you’d like to add? (optional)"
            className="w-full rounded-xl border px-3 py-2 text-[15px]"
            style={{ borderColor: C.hairline, background: "#fff" }}
          />
          <p className="text-xs" style={{ color: C.muted }}>
            {CHECKIN_VISIBILITY}
          </p>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="button" disabled={busy} onClick={post} className="rounded-full px-4 py-2 text-sm font-semibold" style={{ background: C.gold, color: C.chocolate }}>
            {busy ? "Posting…" : "Share check-in"}
          </button>
        </div>
      )}
    </Card>
  );
}

function Reactions({ api, m, onChanged }: { api: Fetcher; m: PublicMessage; onChanged: () => void }) {
  const [mine, setMine] = useState(m.myReactions);
  const [counts, setCounts] = useState(m.reactions);
  const toggle = async (id: (typeof REACTIONS)[number]["id"]) => {
    const active = mine.includes(id);
    setMine(active ? mine.filter((x) => x !== id) : [...mine, id]);
    setCounts({ ...counts, [id]: Math.max(0, counts[id] + (active ? -1 : 1)) });
    const res = await api(`/api/lento-room/messages/${m.id}`, { body: { action: "react", kind: id } });
    if (!res.ok) onChanged();
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTIONS.map((r) => {
        const on = mine.includes(r.id);
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => toggle(r.id)}
            className="rounded-full border px-2.5 py-1 text-xs"
            style={{ borderColor: on ? C.gold : C.hairline, background: on ? "#fff4d6" : "transparent", color: C.ink }}
          >
            {r.label}
            {counts[r.id] > 0 ? ` · ${counts[r.id]}` : ""}
          </button>
        );
      })}
    </div>
  );
}

function MessageBody({ m }: { m: PublicMessage }) {
  if (m.deleted) return <p className="italic text-sm" style={{ color: C.muted }}>This message was removed.</p>;
  return (
    <div className="space-y-1.5">
      {m.kind === "checkin" && m.mood && (
        <p className="text-sm">
          <span className="rounded-full px-2.5 py-0.5" style={{ background: C.caramel, color: C.chocolate }}>
            Arriving: {MOOD_LABEL[m.mood] || m.mood}
          </span>
        </p>
      )}
      {m.body && <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{m.body}</p>}
    </div>
  );
}

function Author({ m }: { m: PublicMessage }) {
  return (
    <p className="text-xs" style={{ color: C.muted }}>
      <strong style={{ color: C.ink }}>{m.author ? m.author.name : "The Lento Room"}</strong>
      {m.author?.isHost && (
        <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: C.gold, color: C.chocolate }}>
          Host
        </span>
      )}
      {" · "}
      {when(m.createdAt)}
      {m.editedAt && " · edited"}
    </p>
  );
}

function OwnActions({ api, m, onChanged }: { api: Fetcher; m: PublicMessage; onChanged: () => void }) {
  const [mode, setMode] = useState<null | "edit" | "delete" | "report">(null);
  const [text, setText] = useState(m.body);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  if (m.deleted || m.kind === "prompt") return null;

  const save = async () => {
    const res = await api<{ error?: string }>(`/api/lento-room/messages/${m.id}`, { method: "PATCH", body: { body: text } });
    if (!res.ok) return setNote(res.data.error || "Couldn’t save.");
    setMode(null);
    onChanged();
  };
  const remove = async () => {
    await api(`/api/lento-room/messages/${m.id}`, { method: "DELETE" });
    setMode(null);
    onChanged();
  };
  const report = async () => {
    const res = await api<{ error?: string }>(`/api/lento-room/messages/${m.id}`, { body: { action: "report", reason } });
    setMode(null);
    setNote(res.ok ? "Thank you. Trevor will look at this privately." : res.data.error || "Couldn’t send the report.");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-3 text-xs" style={{ color: C.muted }}>
        {m.canEdit && (
          <button type="button" onClick={() => setMode(mode === "edit" ? null : "edit")} className="underline">
            Edit
          </button>
        )}
        {m.isMine && (
          <button type="button" onClick={() => setMode(mode === "delete" ? null : "delete")} className="underline">
            Delete
          </button>
        )}
        {!m.isMine && (
          <button type="button" onClick={() => setMode(mode === "report" ? null : "report")} className="underline">
            Report
          </button>
        )}
      </div>
      {mode === "edit" && (
        <div className="space-y-2">
          <AutoGrowTextarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="w-full rounded-xl border px-3 py-2 text-[15px]"
            style={{ borderColor: C.hairline, background: "#fff" }}
          />
          <div className="flex gap-2 text-sm">
            <button type="button" onClick={save} className="rounded-full px-3 py-1 font-semibold" style={{ background: C.gold, color: C.chocolate }}>
              Save
            </button>
            <button type="button" onClick={() => setMode(null)} className="underline" style={{ color: C.muted }}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {mode === "delete" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Delete this for everyone?</span>
          <button type="button" onClick={remove} className="rounded-full px-3 py-1 font-semibold" style={{ background: C.chocolate, color: C.ivory }}>
            Delete
          </button>
          <button type="button" onClick={() => setMode(null)} className="underline" style={{ color: C.muted }}>
            Keep it
          </button>
        </div>
      )}
      {mode === "report" && (
        <div className="space-y-2">
          <p className="text-sm">What’s wrong? Only Trevor sees reports.</p>
          <AutoGrowTextarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={1000}
            className="w-full rounded-xl border px-3 py-2 text-[15px]"
            style={{ borderColor: C.hairline, background: "#fff" }}
            placeholder="Optional"
          />
          <div className="flex gap-2 text-sm">
            <button type="button" onClick={report} className="rounded-full px-3 py-1 font-semibold" style={{ background: C.chocolate, color: C.ivory }}>
              Send report
            </button>
            <button type="button" onClick={() => setMode(null)} className="underline" style={{ color: C.muted }}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {note && <p className="text-xs" style={{ color: C.muted }}>{note}</p>}
    </div>
  );
}

function MessageCard({
  api,
  message: m,
  open,
  onToggleThread,
  onChanged,
}: {
  api: Fetcher;
  message: PublicMessage;
  open: boolean;
  onToggleThread: () => void;
  onChanged: () => void;
}) {
  const isPrompt = m.kind === "prompt";
  return (
    <Card tone={isPrompt ? "prompt" : "card"}>
      <div className="space-y-2.5">
        {isPrompt ? (
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.chocolate }}>
            {SLOT_LABEL[m.promptSlot || ""] || "A conversation"}
          </p>
        ) : (
          <Author m={m} />
        )}
        {m.kind === "question" && !m.deleted && (
          <p className="text-xs" style={{ color: C.muted }}>
            Asks the room{m.wants === "experiences" ? " · would welcome others’ experiences" : m.wants === "sharing" ? " · just sharing" : ""}
          </p>
        )}
        {isPrompt ? (
          <p className="text-[17px] leading-snug" style={{ fontFamily: "var(--font-serif)", color: C.chocolate }}>
            {m.body}
          </p>
        ) : (
          <MessageBody m={m} />
        )}
        {!m.deleted && <Reactions key={`${m.id}:${m.myReactions.join()}:${Object.values(m.reactions).join()}`} api={api} m={m} onChanged={onChanged} />}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={onToggleThread} className="text-sm font-medium" style={{ color: C.chocolate }}>
            {open ? "Hide replies" : m.replyCount > 0 ? `${m.replyCount} ${m.replyCount === 1 ? "reply" : "replies"}` : isPrompt ? "Join the conversation" : "Reply"}
          </button>
          <OwnActions api={api} m={m} onChanged={onChanged} />
        </div>
        {open && <Thread api={api} id={m.id} onChanged={onChanged} />}
      </div>
    </Card>
  );
}

function Thread({ api, id, onChanged }: { api: Fetcher; id: string; onChanged: () => void }) {
  const [replies, setReplies] = useState<PublicMessage[] | null>(null);
  const [following, setFollowing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await api<{ replies?: PublicMessage[]; following?: boolean }>(`/api/lento-room/messages/${id}`);
    if (res.ok) {
      setReplies(res.data.replies || []);
      setFollowing(!!res.data.following);
    }
  }, [api, id]);

  useEffect(() => {
    const init = async () => {
      await load();
    };
    init();
  }, [load]);

  const send = async () => {
    setBusy(true);
    setError("");
    const res = await api<{ error?: string }>("/api/lento-room/messages", { body: { parentId: id, body: text } });
    setBusy(false);
    if (!res.ok) return setError(res.data.error || "Please try again.");
    setText("");
    await load();
    onChanged();
  };

  const toggleFollow = async () => {
    setFollowing(!following);
    await api(`/api/lento-room/messages/${id}`, { body: { action: following ? "unfollow" : "follow" } });
  };

  return (
    <div className="mt-2 space-y-3 border-t pt-3" style={{ borderColor: C.hairline }}>
      {replies === null && <p className="text-sm" style={{ color: C.muted }}>Loading…</p>}
      {replies?.map((r) => (
        <div key={r.id} className="space-y-1.5 pl-3 border-l-2" style={{ borderColor: C.caramel }}>
          <Author m={r} />
          <MessageBody m={r} />
          <Reactions key={`${r.id}:${r.myReactions.join()}`} api={api} m={r} onChanged={load} />
          <OwnActions api={api} m={r} onChanged={load} />
        </div>
      ))}
      <AutoGrowTextarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={4000}
        placeholder="Write a reply"
        className="w-full rounded-xl border px-3 py-2 text-[15px]"
        style={{ borderColor: C.hairline, background: "#fff" }}
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={toggleFollow} className="text-xs underline" style={{ color: C.muted }}>
          {following ? "Following this conversation" : "Follow this conversation"}
        </button>
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={send}
          className="rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
          style={{ background: C.gold, color: C.chocolate }}
        >
          {busy ? "Sending…" : "Reply"}
        </button>
      </div>
    </div>
  );
}

function Composer({ api, onPosted }: { api: Fetcher; onPosted: () => void }) {
  const [text, setText] = useState("");
  const [ask, setAsk] = useState(false);
  const [wants, setWants] = useState<"sharing" | "experiences" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setBusy(true);
    setError("");
    const res = await api<{ error?: string }>("/api/lento-room/messages", {
      body: { kind: ask ? "question" : "message", body: text, wants: ask ? wants : null },
    });
    setBusy(false);
    if (!res.ok) return setError(res.data.error || "Please try again.");
    setText("");
    setAsk(false);
    setWants(null);
    onPosted();
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-20 border-t" style={{ background: C.card, borderColor: C.hairline }}>
      <div className="mx-auto max-w-2xl px-4 py-3 space-y-2" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setAsk(false)}
            className="rounded-full border px-3 py-1"
            style={{ borderColor: !ask ? C.chocolate : C.hairline, background: !ask ? C.chocolate : "transparent", color: !ask ? C.ivory : C.ink }}
          >
            Share
          </button>
          <button
            type="button"
            onClick={() => setAsk(true)}
            className="rounded-full border px-3 py-1"
            style={{ borderColor: ask ? C.chocolate : C.hairline, background: ask ? C.chocolate : "transparent", color: ask ? C.ivory : C.ink }}
          >
            Ask the Room
          </button>
        </div>
        {ask && (
          <div className="flex flex-wrap gap-3 text-xs" style={{ color: C.muted }}>
            {(
              [
                ["sharing", "Just sharing"],
                ["experiences", "I’d welcome others’ experiences"],
              ] as const
            ).map(([id, label]) => (
              <label key={id} className="flex items-center gap-1.5">
                <input type="radio" name="wants" checked={wants === id} onChange={() => setWants(id)} />
                {label}
              </label>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <AutoGrowTextarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            maxHeight="40dvh"
            maxLength={4000}
            placeholder={ask ? "What would you like to ask the room?" : "Share what’s on your mind"}
            className="flex-1 rounded-2xl border px-3 py-2 text-[15px]"
            style={{ borderColor: C.hairline, background: "#fff" }}
          />
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={send}
            className="rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40"
            style={{ background: C.gold, color: C.chocolate }}
          >
            {busy ? "…" : "Send"}
          </button>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}

function NotificationPrefs({ api, me, onSaved, onClose }: { api: Fetcher; me: Me; onSaved: (m: Me) => void; onClose: () => void }) {
  const [prefs, setPrefs] = useState(me.prefs);
  const [saved, setSaved] = useState(false);
  const items: Array<[keyof Me["prefs"], string]> = [
    ["replies", "Someone replies to something I posted"],
    ["followed", "New replies in conversations I follow"],
    ["topics", "A new weekly conversation begins"],
    ["digest", "A weekly summary"],
  ];
  const save = async () => {
    const res = await api<{ me?: Me }>("/api/lento-room/me", { body: { action: "prefs", prefs } });
    if (res.ok && res.data.me) {
      onSaved(res.data.me);
      setSaved(true);
    }
  };
  return (
    <Card>
      <p className="font-semibold" style={{ color: C.chocolate }}>
        Emails about the room
      </p>
      <p className="text-sm mt-1" style={{ color: C.muted }}>
        {NOTIFY_EXPLAINER}
      </p>
      <div className="mt-3 space-y-2">
        {items.map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-[15px]">
            <input type="checkbox" checked={prefs[k]} onChange={(e) => setPrefs({ ...prefs, [k]: e.target.checked })} />
            {label}
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 text-sm">
        <button type="button" onClick={save} className="rounded-full px-4 py-1.5 font-semibold" style={{ background: C.gold, color: C.chocolate }}>
          Save
        </button>
        <button type="button" onClick={onClose} className="underline" style={{ color: C.muted }}>
          Close
        </button>
        {saved && <span style={{ color: C.muted }}>Saved</span>}
      </div>
    </Card>
  );
}
