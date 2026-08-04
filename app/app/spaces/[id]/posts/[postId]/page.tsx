"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSpace, type Space } from "@/lib/data/spaces";
import { hasJoinedSpace } from "@/lib/data/supabase-spaces";
import {
  getPostById,
  getComments,
  createComment,
  createReply,
  addPostReaction,
  updateComment,
  deleteComment,
  getUserReactionForPost,
  groupCommentsIntoThreads,
  type Post,
  type Comment,
} from "@/lib/data/posts";
import { getProfile, getProfilePhoto, type Profile } from "@/lib/data/profiles";
import { getSession } from "@/lib/session";
import { trackNewsletterEvent } from "@/lib/analytics/events";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Avatar } from "@/components/Avatar";
import { ReactionBar } from "@/components/posts/ReactionBar";
import { ToastContainer } from "@/components/Toast";
import { useToast } from "@/lib/hooks/useToast";
import Link from "next/link";

const MAX_COMMENT_LENGTH = 500;
const MIN_COMMENT_LENGTH = 1;

type LoadState =
  | { status: "loading" }
  | { status: "not-signed-in" }
  | { status: "space-not-found" }
  | { status: "not-a-member" }
  | { status: "post-not-found" }
  | { status: "ready" };

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const spaceId = params.id as string;
  const postId = params.postId as string;
  const { toasts, showToast, removeToast } = useToast();

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [space, setSpace] = useState<Space | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [userReaction, setUserReaction] = useState<string | undefined>(undefined);

  const [newResponse, setNewResponse] = useState("");
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const highlightedCommentId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("comment") : null;
  const viewTracked = useRef(false);
  const responseStartTracked = useRef(false);
  const replyStartTracked = useRef<Set<string>>(new Set());
  const lastAddedCommentId = useRef<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      if (!session) {
        const target = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
        router.push(`/auth?next=${encodeURIComponent(target)}`);
        setState({ status: "not-signed-in" });
        return;
      }

      const [s, p] = await Promise.all([getSpace(spaceId), getProfile()]);
      if (!s) {
        setState({ status: "space-not-found" });
        return;
      }

      const isMember = await hasJoinedSpace(session.supabaseUserId || session.id, spaceId);
      if (!isMember) {
        setState({ status: "not-a-member" });
        return;
      }

      const foundPost = await getPostById(postId);
      if (!foundPost || foundPost.spaceId !== spaceId) {
        setState({ status: "post-not-found" });
        return;
      }

      setSpace(s);
      setProfile(p);
      setIsAdmin(session.type === "admin");
      setPost(foundPost);
      setUserReaction(getUserReactionForPost(postId) || undefined);
      getProfilePhoto().then(setProfilePhoto);

      const postComments = await getComments(postId);
      setComments(postComments);

      setState({ status: "ready" });

      if (!viewTracked.current) {
        viewTracked.current = true;
        const searchParams = new URLSearchParams(window.location.search);
        const source = searchParams.get("source");
        if (source === "weekly_newsletter") {
          trackNewsletterEvent({
            eventType: "newsletter_question_viewed",
            questionPostId: postId,
            spaceId,
            campaign: searchParams.get("campaign"),
            source,
            signedInOnArrival: true,
            userId: session.supabaseUserId || session.id,
          });
        }
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, postId]);

  // Scroll/highlight a specific comment referenced by a notification link
  // (?comment=<id>), once the thread has actually rendered. Separately,
  // ?reply=<id> (used by the "Reply" link on the main space feed, see
  // app/app/spaces/[id]/page.tsx) also auto-opens the reply composer for
  // that comment -- so clicking "Reply" from the feed lands you straight
  // in a ready-to-type box instead of just at the right comment.
  useEffect(() => {
    if (state.status !== "ready") return;
    const searchParams = new URLSearchParams(window.location.search);
    const replyTargetId = searchParams.get("reply");
    const targetId = highlightedCommentId || replyTargetId;
    if (!targetId) return;

    const el = document.getElementById(`comment-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-[#d4a348]");
    }
    if (replyTargetId) setReplyToId(replyTargetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  // Scroll a just-added comment/reply into view once it lands in state.
  useEffect(() => {
    if (!lastAddedCommentId.current) return;
    const id = lastAddedCommentId.current;
    lastAddedCommentId.current = null;
    requestAnimationFrame(() => {
      const el = document.getElementById(`comment-${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [comments]);

  if (state.status === "loading" || state.status === "not-signed-in") {
    return <LoadingScreen message="Loading this conversation" subtitle="Just a moment..." />;
  }

  if (state.status === "space-not-found") {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#1a0f0a]">This space doesn&apos;t exist</h1>
        <p className="text-[#a0704a]">The space this question belongs to may have been removed.</p>
        <Link href="/app/spaces"><Button variant="outline">Back to Spaces</Button></Link>
      </div>
    );
  }

  if (state.status === "not-a-member") {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#1a0f0a]">Join this space to see this conversation</h1>
        <p className="text-[#a0704a]">You&apos;ll need to be a member of {space?.name || "this space"} to view and respond to this question.</p>
        <Link href={`/app/spaces/${spaceId}`}><Button variant="primary">Go to {space?.name || "the space"}</Button></Link>
      </div>
    );
  }

  if (state.status === "post-not-found") {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#1a0f0a]">This question isn&apos;t available</h1>
        <p className="text-[#a0704a]">It may have been removed, or the link may be incorrect.</p>
        <Link href={spaceId ? `/app/spaces/${spaceId}` : "/app/spaces"}><Button variant="outline">Back to the space</Button></Link>
      </div>
    );
  }

  if (!post || !space || !profile) return null;

  const findAuthorDisplay = (comment: Comment) => `${comment.authorName}${comment.authorPronouns ? ` (${comment.authorPronouns})` : ""}`;

  const canModify = (authorUserId: string) => profile?.id === authorUserId || isAdmin;

  const handleReaction = async (reactionType: string) => {
    const newSelection = userReaction === reactionType ? undefined : reactionType;
    const updatedReactions = { ...post.reactions };
    if (userReaction && updatedReactions[userReaction]) updatedReactions[userReaction]--;
    if (newSelection) updatedReactions[newSelection] = (updatedReactions[newSelection] || 0) + 1;
    setUserReaction(newSelection);
    setPost({ ...post, reactions: updatedReactions });
    addPostReaction(postId, reactionType, profile.displayName).catch((err) => console.error("Failed to save reaction:", err));
  };

  const handleResponseFocus = () => {
    if (responseStartTracked.current) return;
    responseStartTracked.current = true;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("source") === "weekly_newsletter") {
      trackNewsletterEvent({
        eventType: "question_response_started",
        questionPostId: postId,
        spaceId,
        campaign: searchParams.get("campaign"),
        source: "weekly_newsletter",
        signedInOnArrival: true,
        isReply: false,
      });
    }
  };

  const handleSubmitResponse = async () => {
    const trimmed = newResponse.trim();
    if (!trimmed) {
      showToast("Please write something before posting", "warning");
      return;
    }
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      showToast(`Your response is too long (max ${MAX_COMMENT_LENGTH} characters)`, "error");
      return;
    }
    if (!profile.firstName?.trim() || !profile.lastName?.trim()) {
      showToast("Add your first and last name to your profile before responding.", "warning", 5000, {
        label: "Go to Profile",
        onClick: () => router.push("/app/profile"),
      });
      return;
    }

    try {
      setSubmittingResponse(true);
      const created = await createComment(postId, profile.displayName, trimmed, profile.pronouns, profilePhoto || profile.profilePhoto);
      setComments((prev) => [...prev, created]);
      setNewResponse("");
      lastAddedCommentId.current = created.id;
      showToast("Your response has been added to the conversation.", "success", 4000);

      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("source") === "weekly_newsletter") {
        trackNewsletterEvent({
          eventType: "question_response_submitted",
          questionPostId: postId,
          spaceId,
          campaign: searchParams.get("campaign"),
          source: "weekly_newsletter",
          signedInOnArrival: true,
          isReply: false,
        });
      }
    } catch (err) {
      console.warn("Error submitting response:", err);
      showToast("Failed to add your response. Please check your connection and try again.", "error");
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleReplyFocus = (parentId: string) => {
    if (replyStartTracked.current.has(parentId)) return;
    replyStartTracked.current.add(parentId);
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("source") === "weekly_newsletter") {
      trackNewsletterEvent({
        eventType: "question_reply_started",
        questionPostId: postId,
        spaceId,
        campaign: searchParams.get("campaign"),
        source: "weekly_newsletter",
        signedInOnArrival: true,
        isReply: true,
      });
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    const trimmed = replyContent.trim();
    if (!trimmed) {
      showToast("Please write something before replying", "warning");
      return;
    }
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      showToast(`Your reply is too long (max ${MAX_COMMENT_LENGTH} characters)`, "error");
      return;
    }
    if (!profile.firstName?.trim() || !profile.lastName?.trim()) {
      showToast("Add your first and last name to your profile before replying.", "warning", 5000, {
        label: "Go to Profile",
        onClick: () => router.push("/app/profile"),
      });
      return;
    }

    try {
      setSubmittingReply(true);
      const created = await createReply(postId, parentId, profile.displayName, trimmed, profile.pronouns, profilePhoto || profile.profilePhoto);
      if (!created) {
        showToast("Failed to add your reply. Please try again.", "error");
        return;
      }
      setComments((prev) => [...prev, created]);
      setReplyContent("");
      setReplyToId(null);
      lastAddedCommentId.current = created.id;
      showToast("Your reply has been added.", "success", 4000);

      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("source") === "weekly_newsletter") {
        trackNewsletterEvent({
          eventType: "question_reply_submitted",
          questionPostId: postId,
          spaceId,
          campaign: searchParams.get("campaign"),
          source: "weekly_newsletter",
          signedInOnArrival: true,
          isReply: true,
        });
      }
    } catch (err) {
      console.warn("Error submitting reply:", err);
      showToast("Failed to add your reply. Please check your connection and try again.", "error");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    const trimmed = editingContent.trim();
    if (!trimmed || trimmed.length < MIN_COMMENT_LENGTH) {
      showToast("Please write something before saving", "warning");
      return;
    }
    await updateComment(commentId, trimmed);
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, content: trimmed } : c)));
    setEditingCommentId(null);
    setEditingContent("");
    showToast("Updated", "success", 2000);
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Remove this comment?")) return;
    try {
      await deleteComment(commentId);
    } catch (err) {
      console.error("Error removing comment:", err);
      showToast("Failed to remove this comment. You may not have permission.", "error");
      return;
    }
    // Soft-deleted comments (ones with live replies) stay in the list --
    // deleteComment() doesn't tell us which path it took, so just refetch.
    const refreshed = await getComments(postId);
    setComments(refreshed);
    showToast("Removed", "success", 2000);
  };

  // Group into threads (see lib/data/posts.ts groupCommentsIntoThreads for
  // why a reply-to-a-reply still only ever renders at one indent level).
  const threads = groupCommentsIntoThreads(comments);

  function renderComment(comment: Comment, isReply: boolean) {
    const isRemoved = !!comment.deletedAt;
    return (
      <div
        key={comment.id}
        id={`comment-${comment.id}`}
        className={`p-3 rounded-lg ${isReply ? "ml-6 sm:ml-8" : ""} bg-[#f3ede5] transition-shadow`}
      >
        {isRemoved ? (
          <p className="text-sm italic text-[#a0704a]">This comment has been removed.</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                <Avatar name={comment.authorName} photo={comment.authorPhoto} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1a0f0a]">{findAuthorDisplay(comment)}</p>
                  {isReply && comment.parentCommentId !== comment.rootCommentId && (
                    <p className="text-xs text-[#a0704a]">replying in this thread</p>
                  )}
                  <p className="text-sm mt-1 text-[#1a0f0a]">{comment.content}</p>
                </div>
              </div>
              {canModify(comment.userId) && (
                <div className="flex gap-2 ml-2 shrink-0">
                  <button
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditingContent(comment.content);
                    }}
                    className="text-xs font-medium text-[#d4a348] hover:text-[#8b6f47] transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-xs text-red-500 hover:text-red-400 font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {editingCommentId === comment.id && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  maxLength={MAX_COMMENT_LENGTH}
                  rows={2}
                  className="w-full px-3 py-2 border border-[#ede6e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-sm text-[#1a0f0a] resize-none"
                />
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => handleSaveEdit(comment.id)}>Save</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingCommentId(null)}>Cancel</Button>
                </div>
              </div>
            )}

            <button
              onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
              aria-expanded={replyToId === comment.id}
              className="text-xs font-medium text-[#d4a348] hover:text-[#8b6f47] mt-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a348] rounded"
            >
              Reply
            </button>
          </>
        )}

        {replyToId === comment.id && (
          <div className="mt-3 space-y-2">
            <label htmlFor={`reply-${comment.id}`} className="sr-only">Reply to {comment.authorName}</label>
            <textarea
              id={`reply-${comment.id}`}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onFocus={() => handleReplyFocus(comment.id)}
              placeholder={`Reply to ${comment.authorName}...`}
              rows={2}
              maxLength={MAX_COMMENT_LENGTH}
              className="w-full px-3 py-2 border border-[#ede6e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-sm text-[#1a0f0a] resize-none"
            />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleSubmitReply(comment.id)} disabled={!replyContent.trim() || submittingReply}>
                {submittingReply ? "Replying..." : "Reply"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setReplyToId(null); setReplyContent(""); }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/app/spaces/${spaceId}`} className="text-sm text-[#d4a348] hover:underline font-medium">
          ← {space.name}
        </Link>
      </div>

      <Card className={post.pinned ? "!bg-[#3d2b1a] border-2 border-[#8b6f47] shadow-lg" : ""}>
        {post.pinned && (
          <div className="flex items-center gap-1.5 mb-3 text-xs font-bold uppercase tracking-wider text-[#e0b563]">
            <span>📌</span>
            <span>Question of the Week</span>
          </div>
        )}
        <div className="flex items-start gap-3 mb-3">
          <Avatar name={post.authorName} photo={post.authorPhoto} size="md" />
          <div>
            <p className={`font-medium ${post.pinned ? "text-[#fdf6e8]" : "text-[#1a0f0a]"}`}>
              {post.authorName} {post.authorPronouns && `(${post.authorPronouns})`}
            </p>
            {!post.pinned && (
              <p className="text-xs text-[#a0704a]">
                {new Date(post.createdAt).toLocaleDateString()} at{" "}
                {new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </div>

        {post.title && (
          <p className={`mb-1 ${post.pinned ? "text-2xl font-bold text-[#fdf6e8]" : "text-lg font-semibold text-[#1a0f0a]"}`}>
            {post.title}
          </p>
        )}
        <p className={post.pinned ? "text-[#f3e6d4] text-lg leading-relaxed mb-4" : "text-[#1a0f0a] mb-4"}>{post.content}</p>

        {!post.pinned && (
          <ReactionBar reactions={post.reactions} userReaction={userReaction} onReact={handleReaction} />
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-[#1a0f0a] mb-4">
          {threads.length === 0 ? "Be the first to respond" : `${threads.length} ${threads.length === 1 ? "response" : "responses"}`}
        </h2>

        <div className="space-y-4">
          {threads.map(({ topLevel: comment, replies }) => (
            <div key={comment.id} className="space-y-3">
              {renderComment(comment, false)}
              {replies.map((reply) => renderComment(reply, true))}
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-[#e8ddd2] space-y-2">
          <label htmlFor="new-response" className="sr-only">Your response</label>
          <textarea
            id="new-response"
            value={newResponse}
            onChange={(e) => setNewResponse(e.target.value)}
            onFocus={handleResponseFocus}
            placeholder="Share your response..."
            rows={3}
            maxLength={MAX_COMMENT_LENGTH}
            className="w-full px-4 py-2.5 border border-[#ede6e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-sm text-[#1a0f0a] resize-none"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-[#a0704a]">{newResponse.length} / {MAX_COMMENT_LENGTH}</p>
            <Button variant="primary" size="sm" onClick={handleSubmitResponse} disabled={!newResponse.trim() || submittingResponse}>
              {submittingResponse ? "Posting..." : "Post Response"}
            </Button>
          </div>
        </div>
      </Card>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
