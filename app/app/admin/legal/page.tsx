"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/Card";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";
import { LegalWorkspace } from "@/components/legal/LegalWorkspace";

// Terms of Service / Privacy Policy: private edit links for outside
// reviewers, plus the editor with tracked changes and Publish.

interface EditLink {
  id: string;
  token: string;
  person_name: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

async function adminFetch(url: string, init: RequestInit = {}) {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = data.session?.access_token;
  const response = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: "no-store",
  });
  const raw = await response.text();
  let body: { error?: string; links?: EditLink[]; link?: EditLink } = {};
  try {
    body = JSON.parse(raw);
  } catch {
    body = { error: "The server sent an unexpected response." };
  }
  return { ok: response.ok, body };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminLegalPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [links, setLinks] = useState<EditLink[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    const res = await adminFetch("/api/admin/legal-links");
    if (!res.ok) setError(res.body.error || "Could not load edit links.");
    else setLinks(res.body.links || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }
      setReady(true);
      loadLinks();
    };
    init();
  }, [router, loadLinks]);

  const linkUrl = (token: string) => `${window.location.origin}/legal/edit/${token}`;

  const copy = async (link: EditLink) => {
    try {
      await navigator.clipboard.writeText(linkUrl(link.token));
      setCopied(link.id);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setError("Couldn't copy automatically. Select the link text and copy it.");
    }
  };

  const create = async () => {
    setError("");
    const res = await adminFetch("/api/admin/legal-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personName: name }),
    });
    if (!res.ok || !res.body.link) {
      setError(res.body.error || "Could not create the link.");
      return;
    }
    setName("");
    await loadLinks();
    copy(res.body.link);
  };

  const revoke = async (id: string) => {
    const res = await adminFetch(`/api/admin/legal-links?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setRevoking(null);
    if (!res.ok) setError(res.body.error || "Could not switch off the link.");
    await loadLinks();
  };

  if (!ready) return <LoadingScreen message="Loading legal pages" subtitle="Just a moment..." />;

  const active = links.filter((l) => !l.revoked_at);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Admin", href: "/app/admin" }, { label: "Terms & Privacy" }]} />
      <div>
        <h1 className="text-3xl font-bold text-[#1a0f0a]">Terms &amp; Privacy</h1>
        <p className="text-[#a0704a] mt-1">
          Edit the legal pages, see who changed what, and publish. Members see the published version at /terms and
          /privacy.
        </p>
      </div>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1a0f0a]">Private edit links</h2>
          <p className="text-sm text-[#a0704a] mt-1">
            Make a link for anyone outside the app, like your lawyer. They can edit without an account, their edits are
            tracked under their name, and they can&apos;t publish. Switch a link off anytime.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && create()}
            placeholder="Their name, e.g. Jane Smith (Counsel)"
            className="flex-1 min-w-[220px] rounded-lg border border-[#e8ddd2] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={create}
            disabled={!name.trim()}
            className="px-4 py-2 rounded-lg bg-[#1a0f0a] text-white text-sm font-semibold disabled:opacity-40"
          >
            Create link &amp; copy
          </button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
        {active.length > 0 && (
          <ul className="divide-y divide-[#f0e8df] text-sm">
            {active.map((l) => (
              <li key={l.id} className="py-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-[#1a0f0a]">{l.person_name}</p>
                    <p className="text-[#a0704a]">
                      Made {formatDate(l.created_at)} · {l.last_used_at ? `last opened ${formatDate(l.last_used_at)}` : "not opened yet"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => copy(l)} className="px-3 py-1.5 rounded border border-[#e8ddd2] hover:bg-[#f5f0eb]">
                      {copied === l.id ? "Copied ✓" : "Copy link"}
                    </button>
                    {revoking === l.id ? (
                      <>
                        <button type="button" onClick={() => revoke(l.id)} className="px-3 py-1.5 rounded bg-red-600 text-white">
                          Switch off
                        </button>
                        <button type="button" onClick={() => setRevoking(null)} className="px-3 py-1.5 rounded border border-[#e8ddd2]">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setRevoking(l.id)} className="px-3 py-1.5 rounded border border-[#e8ddd2] hover:bg-[#f5f0eb]">
                        Switch off…
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[#a0704a] break-all select-all">{linkUrl(l.token)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <LegalWorkspace auth={{ kind: "admin" }} />
    </div>
  );
}
