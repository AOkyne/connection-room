"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase/client";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ToastContainer } from "@/components/Toast";
import { useToast } from "@/lib/hooks/useToast";
import {
  buildQuestionUrl,
  renderQuestionHtml,
  renderQuestionPlainText,
  renderCombinedHtml,
  renderCombinedPlainText,
  type NewsletterQuestion,
} from "@/lib/newsletter/generate";
import { appConfig } from "@/lib/config";
import { getNewsletterQuestionStats, type NewsletterQuestionStats } from "@/lib/admin/analytics";

interface AdminQuestion {
  id: string;
  postId: string;
  spaceId: string;
  spaceName: string;
  questionText: string;
  weekNumber: number;
  status: string;
}

const DEFAULT_BUTTON_LABEL = "Join the Conversation";
const DEFAULT_CAMPAIGN = new Date().toISOString().slice(0, 7); // "2026-08"

export default function AdminNewsletterPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [buttonLabels, setButtonLabels] = useState<Record<string, string>>({});
  const [campaign, setCampaign] = useState(DEFAULT_CAMPAIGN);
  const [copied, setCopied] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, NewsletterQuestionStats | null>>({});
  const [statsLoading, setStatsLoading] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }
      setIsAdmin(true);

      if (!supabase) {
        setLoadError("Not connected to Supabase.");
        setMounted(true);
        return;
      }

      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;
      if (!token) {
        setLoadError("Not signed in with a real admin account.");
        setMounted(true);
        return;
      }

      try {
        const response = await fetch("/api/admin/newsletter/questions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          setLoadError(data.error || "Failed to load questions.");
        } else {
          setQuestions(data.questions || []);
        }
      } catch (err) {
        setLoadError("Failed to load questions.");
      }
      setMounted(true);
    };
    load();
  }, [router]);

  if (!mounted) {
    return <LoadingScreen message="Loading newsletter questions" subtitle="Just a moment..." />;
  }
  if (!isAdmin) return null;

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const moveSelected = (id: string, direction: -1 | 1) => {
    setSelectedIds((prev) => {
      const index = prev.indexOf(id);
      if (index === -1) return prev;
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const toNewsletterQuestion = (q: AdminQuestion): NewsletterQuestion => ({
    postId: q.postId,
    spaceId: q.spaceId,
    spaceName: q.spaceName,
    questionText: q.questionText,
    buttonLabel: buttonLabels[q.id]?.trim() || DEFAULT_BUTTON_LABEL,
  });

  const appUrl = appConfig.urls?.app || "https://community.trevorjamesla.com";

  const questionWithUrl = (q: AdminQuestion) => {
    const question = toNewsletterQuestion(q);
    const url = buildQuestionUrl(q.postId, q.spaceId, campaign || DEFAULT_CAMPAIGN, appUrl);
    return { question, url };
  };

  const loadStats = async (q: AdminQuestion) => {
    setStatsLoading((prev) => new Set(prev).add(q.id));
    const result = await getNewsletterQuestionStats(q.postId, campaign || undefined);
    setStats((prev) => ({ ...prev, [q.id]: result }));
    setStatsLoading((prev) => {
      const next = new Set(prev);
      next.delete(q.id);
      return next;
    });
  };

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
      showToast("Copied to clipboard", "success", 2000);
    } catch (err) {
      console.error("Copy failed:", err);
      showToast("Copy failed -- try selecting and copying manually.", "error");
    }
  };

  const selectedQuestions = selectedIds
    .map((id) => questions.find((q) => q.id === id))
    .filter((q): q is AdminQuestion => !!q)
    .map(questionWithUrl);

  const combinedHtml = renderCombinedHtml(selectedQuestions);
  const combinedText = renderCombinedPlainText(selectedQuestions);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl text-[#1a0f0a]">Newsletter Segments</h1>
        <p className="text-[#a0704a] mt-1">
          Pick one or more Questions of the Week, edit the button label, and copy a ready-to-paste segment into the
          weekly newsletter. This doesn&apos;t send anything -- copy and paste it wherever the newsletter is sent from.
        </p>
      </div>

      {loadError && (
        <Card className="border-l-4 border-red-400">
          <p className="text-[#1a0f0a]">{loadError}</p>
        </Card>
      )}

      <Card>
        <CardHeader title="Campaign tag" />
        <p className="text-sm text-[#a0704a] mb-2">
          Used only for tracking which newsletter send a click came from (e.g. &quot;2026-08-questions&quot;) -- not shown to
          members.
        </p>
        <input
          type="text"
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-[#ede6e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-sm text-[#1a0f0a]"
        />
      </Card>

      <Card>
        <CardHeader title="Active questions" />
        {questions.length === 0 && !loadError && (
          <p className="text-[#a0704a]">No newsletter-eligible questions found.</p>
        )}
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="p-3 rounded-lg bg-[#f3ede5]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(q.id)}
                  onChange={() => toggleSelected(q.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#8b6f47]">{q.spaceName}</p>
                  <p className="text-[#1a0f0a]">{q.questionText}</p>
                </div>
              </label>

              {selectedIds.includes(q.id) && (
                <div className="mt-3 ml-7 space-y-2">
                  <label htmlFor={`label-${q.id}`} className="text-xs font-medium text-[#a0704a]">
                    Button label
                  </label>
                  <input
                    id={`label-${q.id}`}
                    type="text"
                    value={buttonLabels[q.id] ?? DEFAULT_BUTTON_LABEL}
                    onChange={(e) => setButtonLabels((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="w-full max-w-sm px-3 py-1.5 border border-[#ede6e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-sm text-[#1a0f0a]"
                  />
                  <div className="flex gap-3">
                    {(() => {
                      const { question, url } = questionWithUrl(q);
                      return (
                        <>
                          <button
                            onClick={() => handleCopy(`html-${q.id}`, renderQuestionHtml(question, url))}
                            className="text-xs font-medium text-[#d4a348] hover:text-[#8b6f47]"
                          >
                            {copied === `html-${q.id}` ? "✓ HTML copied" : "Copy HTML"}
                          </button>
                          <button
                            onClick={() => handleCopy(`text-${q.id}`, renderQuestionPlainText(question, url))}
                            className="text-xs font-medium text-[#d4a348] hover:text-[#8b6f47]"
                          >
                            {copied === `text-${q.id}` ? "✓ Text copied" : "Copy plain text"}
                          </button>
                          <button
                            onClick={() => loadStats(q)}
                            disabled={statsLoading.has(q.id)}
                            className="text-xs font-medium text-[#d4a348] hover:text-[#8b6f47]"
                          >
                            {statsLoading.has(q.id) ? "Loading..." : "View performance"}
                          </button>
                        </>
                      );
                    })()}
                  </div>

                  {stats[q.id] && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#a0704a] mt-1">
                      <span>{stats[q.id]!.visits} newsletter visits</span>
                      <span>{stats[q.id]!.uniqueSignedInVisitors} unique signed-in visitors</span>
                      <span>{stats[q.id]!.responses} responses</span>
                      <span>{stats[q.id]!.replies} replies</span>
                      <span>{(stats[q.id]!.conversionRate * 100).toFixed(0)}% conversion</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {selectedIds.length > 0 && (
        <Card>
          <CardHeader title={`Combined segment (${selectedIds.length} question${selectedIds.length === 1 ? "" : "s"})`} />

          <div className="mb-3 space-y-1">
            {selectedIds.map((id, i) => {
              const q = questions.find((x) => x.id === id);
              if (!q) return null;
              return (
                <div key={id} className="flex items-center justify-between text-sm bg-[#f3ede5] rounded px-3 py-1.5">
                  <span className="text-[#1a0f0a]">{q.spaceName}: {q.questionText.slice(0, 60)}{q.questionText.length > 60 ? "..." : ""}</span>
                  <div className="flex gap-2">
                    <button onClick={() => moveSelected(id, -1)} disabled={i === 0} className="text-xs text-[#d4a348] disabled:opacity-30">↑</button>
                    <button onClick={() => moveSelected(id, 1)} disabled={i === selectedIds.length - 1} className="text-xs text-[#d4a348] disabled:opacity-30">↓</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 mb-4">
            <Button variant="primary" size="sm" onClick={() => handleCopy("combined-html", combinedHtml)}>
              {copied === "combined-html" ? "✓ HTML copied" : "Copy HTML"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleCopy("combined-text", combinedText)}>
              {copied === "combined-text" ? "✓ Text copied" : "Copy plain text"}
            </Button>
          </div>

          <p className="text-xs font-medium text-[#a0704a] mb-2">Preview</p>
          <div
            className="border border-[#ede6e0] rounded-lg p-4 bg-white overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: combinedHtml }}
          />
        </Card>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
