"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AutoGrowTextarea } from "@/components/AutoGrowTextarea";
import {
  createComment,
  createReply,
  deleteComment,
  getComments,
  groupCommentsIntoThreads,
  updateComment,
  type Comment,
} from "@/lib/data/posts";
import { getProfile } from "@/lib/data/profiles";
import { useDraft } from "@/lib/utils/drafts";
import { COMPOSER_REMINDER } from "@/lib/experience/copy";
import { currentUserId, experienceApi, type PublicQuestion } from "@/lib/experience/client";

type ThreadQuestion = PublicQuestion & { myAnonymousCommentIds: string[] };

const MAX_LENGTH = 2000;

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err || "");
  if (msg.includes("experience_anonymous_author")) {
    return "To keep your question anonymous, post here from the anonymous reply box.";
  }
  return "Couldn't post that. Please try again.";
}

// A "Your Experience Wanted" conversation. Open to every signed-in member:
// read without answering first, respond, reply, edit or delete your own,
// report anything that feels wrong. Email links land here (with
// ?respond=1 to open the response box); signed-out visitors go through
// sign-in and come straight back (app layout).
export default function ExperienceThreadPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const questionId = params?.id as string;
  const respond = searchParams?.get("respond") === "1";
  const highlight = searchParams?.get("comment");

  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "preview">("loading");
  const [question, setQuestion] = useState<ThreadQuestion | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ displayName: string; pronouns?: string; profilePhoto?: string } | null>(null);

  const [text, setText] = useState("");
  const draftRestored = useDraft(questionId ? `experience:${questionId}:response` : null, text, setText);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [reporting, setReporting] = useState<{ commentId?: string } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [notice, setNotice] = useState("");
  const composerRef = useRef<HTMLDivElement>(null);

  const reloadComments = useCallback(async (postId: string) => {
    setComments(await getComments(postId));
  }, []);

  const previewRef = useRef(false);

  const reloadQuestion = useCallback(async () => {
    const r = await experienceApi.question(questionId);
    const q = r.data?.question || null;
    setQuestion(q);
    previewRef.current = !!r.data?.adminPreview;
    return q;
  }, [questionId]);

  useEffect(() => {
    (async () => {
      const [q, id, p] = await Promise.all([reloadQuestion(), currentUserId(), getProfile().catch(() => null)]);
      setMyId(id);
      if (p) setProfile({ displayName: p.displayName, pronouns: p.pronouns, profilePhoto: p.profilePhoto });
      if (q && previewRef.current) {
        setState("preview");
        return;
      }
      if (!q || !q.threadPostId || q.status === "removed") {
        setState("unavailable");
        return;
      }
      await reloadComments(q.threadPostId);
      setState("ready");
    })();
  }, [reloadQuestion, reloadComments]);

  useEffect(() => {
    if (state !== "ready") return;
    if (highlight) document.getElementById(`comment-${highlight}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    else if (respond) {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      composerRef.current?.querySelector("textarea")?.focus();
    }
  }, [state, respond, highlight]);

  if (state === "loading") return <LoadingScreen message="Loading conversation" subtitle="Just a moment..." />;

  if (state === "preview" && question) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="rounded-lg border border-[#d4a348] bg-[#fdfaf5] p-4 text-sm text-[#1a0f0a]">
          <strong>Admin preview.</strong> This question hasn&apos;t been sent to any member yet, so its conversation
          doesn&apos;t exist and members can&apos;t see this page. When it&apos;s first sent for real, members who tap the
          email button land here with the response box open.
        </div>
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#f3ede5] text-[#8b6f47]">
              {question.label}
            </span>
            <span className="text-xs text-[#a0704a]">{question.topic.label}</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1a0f0a]">{question.text}</h1>
          <p className="text-sm text-[#6b6460]">{COMPOSER_REMINDER}</p>
        </Card>
        <Link href="/app/admin/experience">
          <Button variant="outline">Back to the admin page</Button>
        </Link>
      </div>
    );
  }

  if (state === "unavailable" || !question || !question.threadPostId) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#1a0f0a]">This conversation isn&apos;t available</h1>
        <p className="text-[#6b6460]">It may have been closed or removed. There are other conversations you&apos;re welcome to join.</p>
        <Link href="/app/experience">
          <Button variant="primary">See current conversations</Button>
        </Link>
      </div>
    );
  }

  const postId = question.threadPostId;
  const isOpen = question.status === "open";
  const anonymousAuthor = question.viewerIsAuthor && !!question.own?.anonymous;
  const isMine = (c: Comment) =>
    question.myAnonymousCommentIds.includes(c.id) || (!!myId && c.userId === myId && !anonymousAuthor);

  const post = async (body: string, parentId?: string) => {
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > MAX_LENGTH) return false;
    setPosting(true);
    setError("");
    try {
      if (anonymousAuthor) {
        const r = await experienceApi.postFollowup(question.id, trimmed, parentId);
        if (r.error) throw new Error(r.error);
        await reloadQuestion();
      } else if (parentId) {
        await createReply(postId, parentId, profile?.displayName || "Member", trimmed, profile?.pronouns, profile?.profilePhoto);
      } else {
        await createComment(postId, profile?.displayName || "Member", trimmed, profile?.pronouns, profile?.profilePhoto);
      }
      await reloadComments(postId);
      return true;
    } catch (err) {
      setError(anonymousAuthor && err instanceof Error ? err.message : friendlyError(err));
      return false;
    } finally {
      setPosting(false);
    }
  };

  const saveEdit = async (c: Comment) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    try {
      if (question.myAnonymousCommentIds.includes(c.id)) {
        const r = await experienceApi.editFollowup(c.id, trimmed);
        if (r.error) throw new Error(r.error);
      } else {
        await updateComment(c.id, trimmed);
      }
      setEditingId(null);
      await reloadComments(postId);
    } catch {
      setError("Couldn't save your edit.");
    }
  };

  const remove = async (c: Comment) => {
    try {
      if (question.myAnonymousCommentIds.includes(c.id)) {
        const r = await experienceApi.deleteFollowup(c.id);
        if (r.error) throw new Error(r.error);
      } else {
        await deleteComment(c.id);
      }
      await reloadComments(postId);
    } catch {
      setError("Couldn't delete that.");
    }
  };

  const sendReport = async () => {
    const r = await experienceApi.report({ postId, commentId: reporting?.commentId, reason: reportReason });
    if (r.error) {
      setError(r.error);
      return;
    }
    setReporting(null);
    setReportReason("");
    setNotice("Thanks for letting us know. A moderator will take a look.");
  };

  const renderComment = (c: Comment, isReply: boolean) => {
    const mine = isMine(c);
    return (
      <div
        key={c.id}
        id={`comment-${c.id}`}
        className={`rounded-lg p-3 ${isReply ? "ml-6 sm:ml-8 bg-[#faf6f0]" : "bg-[#f3ede5]"} ${highlight === c.id ? "ring-2 ring-[#d4a348]" : ""}`}
      >
        {c.deletedAt ? (
          <p className="text-sm italic text-[#a0704a]">This response has been removed.</p>
        ) : editingId === c.id ? (
          <div className="space-y-2">
            <AutoGrowTextarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              maxLength={MAX_LENGTH}
              className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm text-[#1a0f0a] resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={() => saveEdit(c)}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-[#1a0f0a]">
              {c.authorName}
              {mine && <span className="font-normal text-[#a0704a]"> (you)</span>}
            </p>
            <p className="text-sm text-[#1a0f0a] mt-1 whitespace-pre-wrap">{c.content}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs">
              <span className="text-[#a0704a]">{new Date(c.createdAt).toLocaleDateString()}</span>
              {isOpen && (
                <button onClick={() => { setReplyTo(c.id); setReplyText(""); }} className="text-[#8b6f47] hover:underline">
                  Reply
                </button>
              )}
              {mine && (
                <>
                  <button onClick={() => { setEditingId(c.id); setEditText(c.content); }} className="text-[#8b6f47] hover:underline">Edit</button>
                  <button onClick={() => remove(c)} className="text-[#8b6f47] hover:underline">Delete</button>
                </>
              )}
              {!mine && (
                <button onClick={() => setReporting({ commentId: c.id })} className="text-[#a0704a] hover:underline">Report</button>
              )}
            </div>
          </>
        )}
        {replyTo === c.id && (
          <div className="mt-3 space-y-2">
            <AutoGrowTextarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={2}
              maxLength={MAX_LENGTH}
              placeholder={anonymousAuthor ? "Reply as Question author..." : "Write a reply..."}
              className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm text-[#1a0f0a] resize-none bg-white"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={posting || !replyText.trim()} onClick={async () => {
                if (await post(replyText, c.id)) { setReplyTo(null); setReplyText(""); }
              }}>
                {posting ? "Posting..." : "Reply"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setReplyTo(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const threads = groupCommentsIntoThreads(comments);

  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumb
        items={[
          { label: "Home", href: "/app" },
          { label: "Your Experience Wanted", href: "/app/experience" },
          { label: "Conversation", isActive: true },
        ]}
      />

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#f3ede5] text-[#8b6f47]">
            {question.label}
          </span>
          <span className="text-xs text-[#a0704a]">{question.topic.label}</span>
          {!isOpen && <span className="text-xs text-[#a0704a]">· closed to new responses</span>}
        </div>
        <h1 className="text-2xl font-semibold text-[#1a0f0a]">{question.text}</h1>
        {question.context && <p className="text-[#6b6460] whitespace-pre-wrap">{question.context}</p>}
        <div className="flex flex-wrap gap-3 text-xs text-[#a0704a]">
          {question.authorName && <span>Asked by {question.authorName}{question.viewerIsAuthor ? " (you)" : ""}</span>}
          {!question.viewerIsAuthor && (
            <button onClick={() => setReporting({})} className="hover:underline">Report this question</button>
          )}
        </div>
      </Card>

      {notice && <div className="bg-[#fdfaf5] border border-[#e8ddd2] rounded-lg p-3 text-sm text-[#1a0f0a]">{notice}</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      {reporting && (
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[#1a0f0a]">What&apos;s wrong? A moderator will see this.</p>
          <AutoGrowTextarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm text-[#1a0f0a] resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" disabled={!reportReason.trim()} onClick={sendReport}>Send report</Button>
            <Button size="sm" variant="outline" onClick={() => setReporting(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      {isOpen && (
        <div ref={composerRef}>
          <Card className="space-y-3">
            <p className="text-sm text-[#6b6460]">{COMPOSER_REMINDER}</p>
            {anonymousAuthor && (
              <p className="text-xs text-[#8b6f47]">
                You asked this anonymously. Anything you post here shows as &ldquo;Question author&rdquo;.
              </p>
            )}
            <AutoGrowTextarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              maxLength={MAX_LENGTH}
              placeholder={question.viewerIsAuthor ? "Add more to your question, or respond to others..." : "Share your experience..."}
              className="w-full px-4 py-3 border border-[#e8ddd2] rounded-xl text-[#1a0f0a] resize-none focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#a0704a]">
                {text.length} / {MAX_LENGTH}
                {draftRestored && " · Draft restored"}
              </p>
              <Button variant="primary" size="sm" disabled={posting || !text.trim()} onClick={async () => { if (await post(text)) setText(""); }}>
                {posting ? "Posting..." : "Post"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[#1a0f0a]">
          {threads.length === 0 ? "No responses yet" : `${threads.length} ${threads.length === 1 ? "response" : "responses"}`}
        </h2>
        {threads.map(({ topLevel, replies }) => (
          <div key={topLevel.id} className="space-y-2">
            {renderComment(topLevel, false)}
            {replies.map((r) => renderComment(r, true))}
          </div>
        ))}
      </div>
    </div>
  );
}
