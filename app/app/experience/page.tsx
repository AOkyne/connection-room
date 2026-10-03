"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AutoGrowTextarea } from "@/components/AutoGrowTextarea";
import { EXPERIENCE_INTRO } from "@/lib/experience/copy";
import { experienceApi, type MyInvitation, type PublicQuestion, type TopicOption } from "@/lib/experience/client";


function QuestionLabel({ label }: { label: PublicQuestion["label"] }) {
  return (
    <span
      className={`inline-block text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
        label === "Community prompt" ? "bg-[#f3ede5] text-[#8b6f47]" : "bg-[#fdf3e2] text-[#a0704a]"
      }`}
    >
      {label}
    </span>
  );
}

const REVIEW_TEXT: Record<string, string> = {
  not_requested: "Not shared by email",
  pending: "Waiting for a moderator before it's emailed",
  approved: "Approved for invitation emails",
  rejected: "Not approved for email (still open in the app)",
};

// "Your Experience Wanted": browse conversations, see invitations, ask a
// question. Every signed-in member can read and respond here, invited or
// not.
export default function ExperienceHubPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);

  const [asking, setAsking] = useState(false);
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [emailPermission, setEmailPermission] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    const r = await experienceApi.overview();
    if (r.error || !r.data) setError(r.error || "Couldn't load conversations.");
    else {
      setQuestions(r.data.questions);
      setInvitations(r.data.invitations);
      setTopics(r.data.topics);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    const r = await experienceApi.submit({ text, topic, context, anonymous, emailPermission });
    setSubmitting(false);
    if (r.error || !r.data) {
      setFormError(r.error || "Couldn't post your question.");
      if (r.status === 409 && (r.data as any)?.questionId) router.push(`/app/experience/${(r.data as any).questionId}`);
      return;
    }
    router.push(`/app/experience/${r.data.questionId}`);
  };

  const toggleEmail = async (q: PublicQuestion, on: boolean) => {
    const r = await experienceApi.updateOwn(q.id, { emailPermission: on });
    if (r.error) setError(r.error);
    await load();
  };

  if (loading) return <LoadingScreen message="Loading conversations" subtitle="Just a moment..." />;

  const mine = questions.filter((q) => q.viewerIsAuthor);
  const open = questions.filter((q) => q.status === "open");

  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumb items={[{ label: "Home", href: "/app" }, { label: "Your Experience Wanted", isActive: true }]} />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-[#1a0f0a]">Your Experience Wanted</h1>
        <p className="text-lg text-[#6b6460]">{EXPERIENCE_INTRO}</p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Button variant="primary" size="sm" onClick={() => setAsking((v) => !v)}>
            {asking ? "Close" : "Ask a question"}
          </Button>
          <Link href="/app/experience/preferences" className="text-sm text-[#8b6f47] underline self-center">
            Question invitation settings
          </Link>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      {asking && (
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <h2 className="text-lg font-semibold text-[#1a0f0a]">Ask other members about their experience</h2>
            <div>
              <label className="block text-sm font-medium text-[#1a0f0a] mb-1">Your question</label>
              <AutoGrowTextarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="e.g. How have you made friends after a big move?"
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg text-[#1a0f0a] resize-none focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a0f0a] mb-1">Topic</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg bg-white text-[#1a0f0a]"
              >
                <option value="">Choose a topic</option>
                {topics.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a0f0a] mb-1">
                A little context <span className="font-normal text-[#a0704a]">(optional, stays in the app)</span>
              </label>
              <AutoGrowTextarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={2}
                maxLength={600}
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg text-[#1a0f0a] resize-none focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-[#1a0f0a]">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="mt-1 w-4 h-4" />
              <span>
                <strong>Post anonymously.</strong> Members will see &ldquo;A member&rdquo; and, for your own replies in
                this conversation, &ldquo;Question author&rdquo;. Moderators can see who asked, only to keep the space
                safe.
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-[#1a0f0a]">
              <input
                type="checkbox"
                checked={emailPermission}
                onChange={(e) => setEmailPermission(e.target.checked)}
                className="mt-1 w-4 h-4"
              />
              <span>
                <strong>Include my question in invitation emails to other members.</strong> Only the question text,
                never your context. A moderator reviews it first. Emails can&apos;t be recalled once sent, but you can
                stop future emails at any time.
              </span>
            </label>
            {formError && <p className="text-sm text-red-700">{formError}</p>}
            <Button type="submit" variant="primary" size="sm" disabled={submitting || !text.trim() || !topic}>
              {submitting ? "Posting..." : "Post question"}
            </Button>
          </form>
        </Card>
      )}

      {invitations.length > 0 && (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-[#1a0f0a]">Questions you were invited to</h2>
          {invitations.map((inv) => (
            <Link key={inv.id} href={`/app/experience/${inv.questionId}`} className="block rounded-lg border border-[#e8ddd2] p-3 hover:bg-[#fdfaf5]">
              <p className="text-[#1a0f0a]">{inv.questionText}</p>
              <p className="text-xs text-[#a0704a] mt-1">Invited {new Date(inv.sentAt).toLocaleDateString()}</p>
            </Link>
          ))}
        </Card>
      )}

      {mine.length > 0 && (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-[#1a0f0a]">Your questions</h2>
          {mine.map((q) => (
            <div key={q.id} className="rounded-lg border border-[#e8ddd2] p-3 space-y-2">
              <Link href={`/app/experience/${q.id}`} className="text-[#1a0f0a] hover:underline">
                {q.text}
              </Link>
              <p className="text-xs text-[#a0704a]">
                {q.own?.anonymous ? "Posted anonymously" : "Posted with your name"} · {q.responseCount}{" "}
                {q.responseCount === 1 ? "response" : "responses"}
                {q.status !== "open" && ` · ${q.status}`}
              </p>
              {q.status === "open" && (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-[#6b6460]">{q.own?.emailPermission ? REVIEW_TEXT[q.own.emailReview] : "Not shared by email"}</span>
                  <button onClick={() => toggleEmail(q, !q.own?.emailPermission)} className="text-[#8b6f47] underline">
                    {q.own?.emailPermission ? "Stop future emails" : "Allow invitation emails"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-[#1a0f0a]">Current conversations</h2>
        {open.length === 0 ? (
          <Card>
            <p className="text-[#6b6460]">No conversations yet. Be the first to ask something.</p>
          </Card>
        ) : (
          open.map((q) => (
            <Link key={q.id} href={`/app/experience/${q.id}`} className="block">
              <Card className="space-y-2 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-center gap-2">
                  <QuestionLabel label={q.label} />
                  <span className="text-xs text-[#a0704a]">{q.topic.label}</span>
                </div>
                <p className="text-lg text-[#1a0f0a]">{q.text}</p>
                <p className="text-xs text-[#a0704a]">
                  {q.authorName ? `${q.authorName} · ` : ""}
                  {q.responseCount === 0 ? "No responses yet" : `${q.responseCount} ${q.responseCount === 1 ? "response" : "responses"}`}
                </p>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
