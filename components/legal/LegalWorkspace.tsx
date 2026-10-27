"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { sanitizeLegalHtml } from "@/lib/legal/sanitize";
import type { LegalPageState } from "@/lib/legal/server";
import type { LegalSlug } from "@/lib/legal/seed";

// The Terms / Privacy editor with tracked changes. Used by admins inside
// the app (/app/admin/legal, can publish) and by outside reviewers through
// a private edit link (/legal/edit/[token], can edit but not publish).
//
// Saves happen automatically a couple of seconds after typing stops; every
// save is recorded under the editor's name, and "Show changes" replays them
// as Word-style tracked changes since the last publish. Confirmations are
// in-page (Safari's native confirm/prompt are unreliable).

export type LegalAuth = { kind: "token"; token: string } | { kind: "admin" };

type SaveState = "saved" | "dirty" | "saving" | "error";

const AUTOSAVE_DELAY_MS = 2000;

const TOOL = "px-2.5 py-1.5 rounded text-sm hover:bg-[#e8ddd2] text-[#1a0f0a] whitespace-nowrap";

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function authHeaders(auth: LegalAuth): Promise<Record<string, string>> {
  if (auth.kind === "token") return { "x-legal-token": auth.token };
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function call<T>(auth: LegalAuth, url: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const headers = await authHeaders(auth);
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...headers, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const raw = await response.text();
  let data: T;
  try {
    data = JSON.parse(raw) as T;
  } catch {
    data = { error: "The server sent an unexpected response." } as T;
  }
  return { ok: response.ok, status: response.status, data };
}

interface WorkspaceResponse {
  actor?: { kind: "admin" | "reviewer"; name: string };
  pages?: LegalPageState[];
  error?: string;
}

interface SaveResponse {
  changed?: boolean;
  draftRev?: string;
  error?: string;
  conflict?: { updatedBy: string; updatedAt: string };
}

export function LegalWorkspace({ auth: authProp }: { auth: LegalAuth }) {
  // Callers pass an inline object; keep one per identity so loading doesn't loop.
  const authKey = authProp.kind === "token" ? authProp.token : "admin";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const auth = useMemo(() => authProp, [authKey]);
  const [pages, setPages] = useState<LegalPageState[] | null>(null);
  const [actor, setActor] = useState<{ kind: "admin" | "reviewer"; name: string } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [slug, setSlug] = useState<LegalSlug>("terms");
  const [mode, setMode] = useState<"edit" | "changes" | "history">("edit");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [conflict, setConflict] = useState<{ updatedBy: string; updatedAt: string } | null>(null);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState<null | { kind: "publish" } | { kind: "restore"; versionId: string; label: string }>(null);
  const [busy, setBusy] = useState(false);
  const [linkBox, setLinkBox] = useState<{ open: boolean; url: string }>({ open: false, url: "" });

  const editorRef = useRef<HTMLDivElement | null>(null);
  const revRef = useRef<Record<string, string>>({});
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  // Bumped whenever the editor should be (re)filled from the server copy.
  const [editorSeed, setEditorSeed] = useState(0);

  const page = pages?.find((p) => p.slug === slug) || null;

  const load = useCallback(async () => {
    const res = await call<WorkspaceResponse>(auth, "/api/legal");
    if (!res.ok || !res.data.pages) {
      setLoadError(res.data.error || "Could not load the legal pages.");
      return null;
    }
    setLoadError("");
    setActor(res.data.actor || null);
    setPages(res.data.pages);
    for (const p of res.data.pages) {
      if (!dirtyRef.current || !revRef.current[p.slug]) revRef.current[p.slug] = p.draftRev;
    }
    return res.data.pages;
  }, [auth]);

  useEffect(() => {
    const init = async () => {
      const loaded = await load();
      if (loaded) setEditorSeed((n) => n + 1);
    };
    init();
  }, [load]);

  // Fill the editor from the server copy (initial load, page switch, reload).
  useEffect(() => {
    if (!page || !editorRef.current || mode !== "edit") return;
    editorRef.current.innerHTML = page.draftHtml;
    dirtyRef.current = false;
    // Deliberately keyed on the seed and page, not on every refresh of `pages`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorSeed, slug, mode]);

  const save = useCallback(
    async (opts: { overwrite?: boolean } = {}) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const el = editorRef.current;
      if (!el || !dirtyRef.current) return true;
      setSaveState("saving");
      let draftRev = revRef.current[slug];
      if (opts.overwrite) {
        const fresh = await load();
        draftRev = fresh?.find((p) => p.slug === slug)?.draftRev || draftRev;
      }
      const res = await call<SaveResponse>(auth, "/api/legal/save", { slug, html: el.innerHTML, draftRev });
      if (res.status === 409) {
        setConflict(res.data.conflict || { updatedBy: "someone else", updatedAt: "" });
        setSaveState("error");
        return false;
      }
      if (!res.ok || !res.data.draftRev) {
        setSaveState("error");
        setMessage(res.data.error || "Could not save. Your text is still here; try again.");
        return false;
      }
      revRef.current[slug] = res.data.draftRev;
      dirtyRef.current = false;
      setConflict(null);
      setMessage("");
      setSaveState("saved");
      return true;
    },
    [auth, slug, load]
  );

  const markDirty = () => {
    dirtyRef.current = true;
    setSaveState("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!conflict) save();
    }, AUTOSAVE_DELAY_MS);
  };

  // Warn before closing the tab with unsaved typing.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const switchTo = async (next: { slug?: LegalSlug; mode?: "edit" | "changes" | "history" }) => {
    if (mode === "edit" && dirtyRef.current) {
      const ok = await save();
      if (!ok) return;
    }
    if (next.mode !== "edit" || next.slug) await load();
    if (next.slug) setSlug(next.slug);
    if (next.mode) setMode(next.mode);
    setConfirm(null);
    setLinkBox({ open: false, url: "" });
  };

  const reloadTheirs = async () => {
    dirtyRef.current = false;
    revRef.current[slug] = "";
    await load();
    setConflict(null);
    setSaveState("saved");
    setEditorSeed((n) => n + 1);
  };

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    markDirty();
  };

  const openLinkBox = () => {
    const sel = window.getSelection();
    savedRangeRef.current = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    setLinkBox({ open: true, url: "https://" });
  };

  const applyLink = () => {
    const url = linkBox.url.trim();
    const range = savedRangeRef.current;
    setLinkBox({ open: false, url: "" });
    if (!range || !url || url === "https://") return;
    editorRef.current?.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    if (range.collapsed) document.execCommand("insertText", false, url);
    if (range.collapsed) {
      // Select the URL just typed so it becomes the link text.
      const r = sel?.getRangeAt(0);
      if (r) {
        r.setStart(r.endContainer, Math.max(0, r.endOffset - url.length));
        sel?.removeAllRanges();
        sel?.addRange(r);
      }
    }
    document.execCommand("createLink", false, url);
    markDirty();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData("text/html");
    if (!html) return; // plain text pastes fine as-is
    e.preventDefault();
    document.execCommand("insertHTML", false, sanitizeLegalHtml(html));
    markDirty();
  };

  const publish = async () => {
    setBusy(true);
    const ok = await save();
    if (!ok) {
      setBusy(false);
      return;
    }
    const res = await call<{ error?: string }>(auth, "/api/legal/publish", { slug });
    setBusy(false);
    setConfirm(null);
    if (!res.ok) {
      setMessage(res.data.error || "Could not publish.");
      return;
    }
    await load();
    setMessage(`Published. ${page?.path ? `Members now see this version at ${page.path}.` : ""}`);
  };

  const restore = async (versionId: string) => {
    setBusy(true);
    const res = await call<SaveResponse>(auth, "/api/legal/restore", { versionId, draftRev: revRef.current[slug] });
    setBusy(false);
    setConfirm(null);
    if (res.status === 409) {
      setConflict(res.data.conflict || { updatedBy: "someone else", updatedAt: "" });
      return;
    }
    if (!res.ok) {
      setMessage(res.data.error || "Could not restore that version.");
      return;
    }
    if (res.data.draftRev) revRef.current[slug] = res.data.draftRev;
    await load();
    setMode("edit");
    setEditorSeed((n) => n + 1);
    setMessage("Restored. The restore is saved as a new tracked change under your name.");
  };

  if (loadError && !pages) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{loadError}</div>
    );
  }
  if (!pages || !page) {
    return <p className="text-[#a0704a]">Loading the legal pages…</p>;
  }

  const isAdmin = actor?.kind === "admin";
  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "dirty"
      ? "Unsaved changes"
      : saveState === "error"
      ? "Not saved"
      : "All changes saved";

  return (
    <div className="space-y-4">
      {/* Page tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#e8ddd2]">
        {pages.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => p.slug !== slug && switchTo({ slug: p.slug })}
            className={`px-4 py-2 -mb-px border-b-2 text-sm font-medium ${
              p.slug === slug ? "border-[#d4a348] text-[#1a0f0a]" : "border-transparent text-[#a0704a] hover:text-[#1a0f0a]"
            }`}
          >
            {p.title}
            {p.hasUnpublishedChanges && <span className="ml-1.5 text-[#d4a348]" title="Has unpublished changes">●</span>}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-sm text-[#a0704a] space-y-0.5">
          <p>
            Last edited by <strong className="text-[#1a0f0a]">{page.draftUpdatedBy}</strong>, {formatWhen(page.draftUpdatedAt)}
          </p>
          {page.path && (
            <p>
              {page.publishedAt ? (
                <>
                  Published {formatWhen(page.publishedAt)} by {page.publishedBy} ·{" "}
                  <a href={page.path} target="_blank" rel="noopener noreferrer" className="underline">
                    View live page
                  </a>
                </>
              ) : (
                "Not published yet. Members still see the old placeholder."
              )}
              {page.hasUnpublishedChanges && page.publishedAt && " · Draft has unpublished changes"}
            </p>
          )}
          {!page.path && <p>Working notes. Never published.</p>}
        </div>
        {isAdmin && page.path && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirm({ kind: "publish" })}
            className="px-4 py-2 rounded-lg bg-[#d4a348] text-white text-sm font-semibold disabled:opacity-40"
          >
            Publish {page.title}
          </button>
        )}
      </div>

      {confirm?.kind === "publish" && (
        <div className="rounded-lg border border-[#d4a348] bg-[#fdf8ef] p-4 space-y-3">
          <p className="text-sm text-[#1a0f0a]">
            Publish this version of the {page.title}? Members will see it at {page.path} right away, and tracked
            changes will start fresh from it.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={publish} disabled={busy} className="px-4 py-2 rounded-lg bg-[#d4a348] text-white text-sm font-semibold">
              {busy ? "Publishing…" : "Yes, publish"}
            </button>
            <button type="button" onClick={() => setConfirm(null)} className="px-4 py-2 rounded-lg border border-[#e8ddd2] text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {conflict && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3 text-sm text-red-800">
          <p>
            {conflict.updatedBy} saved changes to this page{conflict.updatedAt ? ` at ${formatWhen(conflict.updatedAt)}` : ""} while you
            were editing, so your latest edits weren&apos;t saved yet.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={reloadTheirs} className="px-3 py-1.5 rounded border border-red-300 bg-white">
              Load their version (discard my unsaved edits)
            </button>
            <button type="button" onClick={() => save({ overwrite: true })} className="px-3 py-1.5 rounded border border-red-300 bg-white">
              Save mine over it (theirs stays in History)
            </button>
          </div>
        </div>
      )}

      {message && <div className="rounded-lg bg-[#f5f0eb] p-3 text-sm text-[#1a0f0a]">{message}</div>}

      {/* Mode switch */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-[#e8ddd2] overflow-hidden text-sm">
          {(
            [
              ["edit", "Edit"],
              ["changes", `Show changes${page.changes.changeCount ? ` (${page.changes.authors.length} ${page.changes.authors.length === 1 ? "person" : "people"})` : ""}`],
              ["history", "History"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => m !== mode && switchTo({ mode: m })}
              className={`px-3 py-1.5 ${m === mode ? "bg-[#1a0f0a] text-white" : "bg-white text-[#1a0f0a] hover:bg-[#f5f0eb]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === "edit" && (
          <span className={`text-sm ${saveState === "error" ? "text-red-700" : "text-[#a0704a]"}`}>{saveLabel}</span>
        )}
      </div>

      {mode === "edit" && (
        <div className="rounded-xl border border-[#e8ddd2] bg-white">
          <div className="sticky top-0 z-10 flex flex-wrap gap-1 border-b border-[#e8ddd2] bg-[#faf6f1] p-2 rounded-t-xl">
            <button type="button" className={TOOL} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "<h2>")}>
              Heading
            </button>
            <button type="button" className={TOOL} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "<h3>")}>
              Subheading
            </button>
            <button type="button" className={TOOL} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "<p>")}>
              Normal
            </button>
            <span className="w-px bg-[#e8ddd2] mx-1" />
            <button type="button" className={`${TOOL} font-bold`} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}>
              B
            </button>
            <button type="button" className={`${TOOL} italic`} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}>
              I
            </button>
            <button type="button" className={`${TOOL} underline`} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")}>
              U
            </button>
            <span className="w-px bg-[#e8ddd2] mx-1" />
            <button type="button" className={TOOL} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")}>
              • List
            </button>
            <button type="button" className={TOOL} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")}>
              1. List
            </button>
            <button type="button" className={TOOL} onMouseDown={(e) => e.preventDefault()} onClick={openLinkBox}>
              Link
            </button>
            <button type="button" className={TOOL} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("unlink")}>
              Unlink
            </button>
            <span className="w-px bg-[#e8ddd2] mx-1" />
            <button type="button" className={TOOL} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("undo")}>
              Undo
            </button>
            <button type="button" className={TOOL} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("redo")}>
              Redo
            </button>
            <button
              type="button"
              className={`${TOOL} ml-auto font-semibold`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => save()}
              disabled={saveState === "saving"}
            >
              Save now
            </button>
          </div>
          {linkBox.open && (
            <div className="flex flex-wrap items-center gap-2 border-b border-[#e8ddd2] bg-[#fdf8ef] p-2">
              <input
                type="url"
                value={linkBox.url}
                autoFocus
                onChange={(e) => setLinkBox({ open: true, url: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink();
                  }
                }}
                className="flex-1 min-w-[200px] rounded border border-[#e8ddd2] px-2 py-1 text-sm"
                placeholder="https://"
              />
              <button type="button" onClick={applyLink} className="px-3 py-1 rounded bg-[#1a0f0a] text-white text-sm">
                Add link
              </button>
              <button type="button" onClick={() => setLinkBox({ open: false, url: "" })} className="px-3 py-1 rounded border border-[#e8ddd2] text-sm">
                Cancel
              </button>
            </div>
          )}
          <div
            ref={editorRef}
            className="legal-doc min-h-[60vh] p-5 sm:p-8"
            contentEditable
            suppressContentEditableWarning
            onFocus={() => document.execCommand("defaultParagraphSeparator", false, "p")}
            onInput={markDirty}
            onPaste={onPaste}
            onBlur={() => dirtyRef.current && !conflict && save()}
          />
        </div>
      )}

      {mode === "changes" && (
        <div className="space-y-3">
          <div className="rounded-lg bg-[#faf6f1] p-3 text-sm text-[#1a0f0a] space-y-2">
            <p>
              Changes since {page.changesSince.label} ({formatWhen(page.changesSince.at)}). Added text is underlined,
              removed text is struck through. Hover over or tap any change to see who made it and when.
            </p>
            {page.changes.authors.length === 0 ? (
              <p className="text-[#a0704a]">No changes yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-x-5 gap-y-1">
                {page.changes.authors.map((a) => (
                  <li key={a.name} className="flex items-center gap-2">
                    <span className={`lc-swatch lc-author-${a.color} inline-block w-3 h-3 rounded-full`} />
                    <span>
                      <strong>{a.name}</strong>: {a.additions} {a.additions === 1 ? "word" : "words"} added, {a.removals} removed · last{" "}
                      {formatWhen(a.lastAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div
            className="legal-doc rounded-xl border border-[#e8ddd2] bg-white p-5 sm:p-8"
            dangerouslySetInnerHTML={{ __html: page.changes.html }}
          />
        </div>
      )}

      {mode === "history" && (
        <div className="rounded-xl border border-[#e8ddd2] bg-white divide-y divide-[#f0e8df]">
          {page.history.map((v, i) => (
            <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div>
                <p className="text-[#1a0f0a]">
                  <strong>{v.authorName}</strong>
                  {i === 0 && <span className="ml-2 text-xs rounded bg-[#f5f0eb] px-1.5 py-0.5">Current draft</span>}
                  {v.publishedAt && <span className="ml-2 text-xs rounded bg-[#eaf5ea] text-[#2f7d32] px-1.5 py-0.5">Published {formatWhen(v.publishedAt)}</span>}
                </p>
                <p className="text-[#a0704a]">
                  {formatWhen(v.createdAt)}
                  {v.updatedAt !== v.createdAt && ` – ${formatWhen(v.updatedAt)}`}
                </p>
              </div>
              {i > 0 &&
                (confirm?.kind === "restore" && confirm.versionId === v.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[#1a0f0a]">Make this the current draft?</span>
                    <button type="button" disabled={busy} onClick={() => restore(v.id)} className="px-3 py-1 rounded bg-[#1a0f0a] text-white">
                      {busy ? "Restoring…" : "Restore"}
                    </button>
                    <button type="button" onClick={() => setConfirm(null)} className="px-3 py-1 rounded border border-[#e8ddd2]">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirm({ kind: "restore", versionId: v.id, label: v.authorName })}
                    className="px-3 py-1 rounded border border-[#e8ddd2] hover:bg-[#f5f0eb]"
                  >
                    Restore this version
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
