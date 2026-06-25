"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSpace } from "@/lib/data/spaces";
import { getPosts, createPost, addPostReaction, getComments, createComment, getUserReactionForPost, type Post, type Comment } from "@/lib/data/posts";
import { getProfile } from "@/lib/data/profiles";
import { appConfig } from "@/lib/config";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SpaceIconSVG } from "@/components/SpaceIconSVG";
import { StartHereChecklist } from "@/components/StartHereChecklist";
import { FirstWeekStartHereCard } from "@/components/journey/FirstWeekStartHereCard";
import { EmptySpaceInvitation } from "@/components/connection/EmptySpaceInvitation";
import { WeeklyCommonsThread } from "@/components/connection/WeeklyCommonsThread";
import { CommentingGuideHelper } from "@/components/connection/CommentingGuideHelper";
import { PostTemplateSelector } from "@/components/connection/PostTemplateSelector";
import { SkeletonPost, SkeletonCard } from "@/components/Skeleton";
import { postTemplates } from "@/lib/content/post-templates";
import { ReactionBar } from "@/components/posts/ReactionBar";
import {
  checkAndAwardFirstShare,
  checkAndAwardFirstWitness,
  checkAndAwardThoughtfulWitness,
  checkAndAwardCommunityBuilder,
} from "@/lib/data/connection-practice";
import { IconIntegration, IconReflection } from "@/components/Icons";
import { ToastContainer } from "@/components/Toast";
import { useToast } from "@/lib/hooks/useToast";
import { Avatar } from "@/components/Avatar";
import { ErrorFeedback } from "@/components/ErrorFeedback";
import { LoadingStateFeedback } from "@/components/LoadingStateFeedback";
import { demoMembers } from "@/lib/seed/demo-members";
import { demoSpaceMemberships } from "@/lib/seed/demo-space-memberships";
import Link from "next/link";

const MAX_POST_LENGTH = 2000;
const MIN_POST_LENGTH = 10;
const MAX_COMMENT_LENGTH = 500;
const MIN_COMMENT_LENGTH = 1;

export default function SpaceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const spaceId = params.id as string;
  const { toasts, showToast, removeToast } = useToast();

  const [space, setSpace] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newPostContent, setNewPostContent] = useState("");
  const [newCommentContent, setNewCommentContent] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<{ [postId: string]: string | null }>({});
  const [retryingPost, setRetryingPost] = useState(false);
  const [retryingComment, setRetryingComment] = useState<Set<string>>(new Set());
  const [pendingPostContent, setPendingPostContent] = useState<string | null>(null);
  const [pendingCommentContent, setPendingCommentContent] = useState<{ [postId: string]: string }>({});
  const [userReactions, setUserReactions] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const stored = localStorage.getItem("connection-room:user-reactions");
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    const loadData = async () => {
      // Fetch space and profile in parallel
      const [s, p] = await Promise.all([
        getSpace(spaceId),
        getProfile(),
      ]);

      if (!s) {
        router.push("/app/spaces");
        return;
      }

      setSpace(s);
      setProfile(p);

      // Load posts
      const spacePosts = await getPosts(spaceId);
      setPosts(spacePosts);

      setMounted(true);
    };

    loadData();
  }, [spaceId, router]);

  if (!mounted) {
    return <LoadingScreen message="Getting ready for this space" subtitle="We're personalizing your experience. Just a moment..." />;
  }

  if (!space || !profile) {
    return null;
  }

  const handleCreatePost = async () => {
    const trimmedContent = newPostContent.trim();

    // Validation
    if (!trimmedContent) {
      showToast("Please write something before posting", "warning");
      return;
    }

    if (trimmedContent.length < MIN_POST_LENGTH) {
      showToast(`Please write at least ${MIN_POST_LENGTH} characters`, "info");
      return;
    }

    if (trimmedContent.length > MAX_POST_LENGTH) {
      showToast(`Your post is too long (max ${MAX_POST_LENGTH} characters)`, "error");
      return;
    }

    try {
      setIsSubmitting(true);
      setPostError(null);
      const newPost = await createPost(spaceId, profile.displayName, trimmedContent, false, undefined, profile.pronouns, profile.profilePhoto);
      setPosts([newPost, ...posts]);
      setNewPostContent("");
      setPendingPostContent(null);
      const previewText = trimmedContent.length > 50 ? trimmedContent.substring(0, 47) + "..." : trimmedContent;
      showToast(`Shared: "${previewText}"`, "success", 4000);

      // Check and award milestones
      const postCount = posts.length + 1;
      await checkAndAwardFirstShare(profile.id, postCount);
      await checkAndAwardCommunityBuilder(profile.id, postCount, 0);
    } catch (error) {
      console.warn("Error creating post:", error);
      setPendingPostContent(trimmedContent);
      setPostError("Failed to share your reflection. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryPost = async () => {
    if (!pendingPostContent) return;
    setRetryingPost(true);
    // Call handleCreatePost with the pending content
    await handleCreatePost();
    setRetryingPost(false);
  };

  const handleAddComment = async (postId: string) => {
    const content = newCommentContent[postId];
    const trimmedContent = content?.trim();

    // Validation
    if (!trimmedContent) {
      showToast("Please write something before commenting", "warning");
      return;
    }

    if (trimmedContent.length > MAX_COMMENT_LENGTH) {
      showToast(`Your comment is too long (max ${MAX_COMMENT_LENGTH} characters)`, "error");
      return;
    }

    try {
      setIsSubmitting(true);
      setCommentError({ ...commentError, [postId]: null });
      await createComment(postId, profile.displayName, trimmedContent, profile.pronouns, profile.profilePhoto);
      setNewCommentContent({ ...newCommentContent, [postId]: "" });
      setPendingCommentContent({ ...pendingCommentContent, [postId]: "" });
      const previewText = trimmedContent.length > 50 ? trimmedContent.substring(0, 47) + "..." : trimmedContent;
      showToast(`Response added: "${previewText}"`, "success", 4000);

      // Refresh posts to show updated comment count and comments
      const updatedPosts = await getPosts(spaceId);
      const post = updatedPosts.find(p => p.id === postId);

      // Increment comment count optimistically since database update may fail due to RLS
      if (post) {
        post.commentCount = (post.commentCount || 0) + 1;
      }

      setPosts(updatedPosts);

      // Refresh comments for this post
      const postComments = await getComments(postId);
      setComments({ ...comments, [postId]: postComments });

      // Check and award milestones
      const totalComments = updatedPosts.reduce((sum, p) => sum + (p.commentCount || 0), 0);
      await checkAndAwardFirstWitness(profile.id, totalComments);
      await checkAndAwardThoughtfulWitness(profile.id, totalComments);
    } catch (error) {
      console.warn("Error adding comment:", error);
      setPendingCommentContent({ ...pendingCommentContent, [postId]: trimmedContent });
      setCommentError({ ...commentError, [postId]: "Failed to add your response. Please check your connection and try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryComment = async (postId: string) => {
    const retrying = new Set(retryingComment);
    retrying.add(postId);
    setRetryingComment(retrying);

    const content = pendingCommentContent[postId];
    if (content) {
      setNewCommentContent({ ...newCommentContent, [postId]: content });
      await handleAddComment(postId);
    }

    retrying.delete(postId);
    setRetryingComment(retrying);
  };

  const handleReaction = async (postId: string, reactionType: string) => {
    // Optimistic update: change UI immediately
    const currentReaction = userReactions[postId];
    const newSelection = currentReaction === reactionType ? undefined : reactionType;
    const newUserReactions = { ...userReactions };

    if (newSelection === undefined) {
      delete newUserReactions[postId];
    } else {
      newUserReactions[postId] = newSelection;
    }
    setUserReactions(newUserReactions);

    // Update the post's reaction counts optimistically
    const post = posts.find(p => p.id === postId);
    if (post) {
      const updatedReactions = { ...post.reactions };

      // Decrement old reaction if exists
      if (currentReaction && updatedReactions[currentReaction]) {
        updatedReactions[currentReaction]--;
      }

      // Increment new reaction if selected
      if (newSelection) {
        updatedReactions[newSelection] = (updatedReactions[newSelection] || 0) + 1;
      }

      post.reactions = updatedReactions;
      setPosts([...posts]);
    }

    // Persist to storage in the background (don't await)
    addPostReaction(postId, reactionType, profile.displayName).catch(err => {
      console.error("Failed to save reaction:", err);
    });
  };

  const toggleExpandPost = async (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      // Load comments for this post
      if (!comments[postId]) {
        const postComments = await getComments(postId);
        setComments({ ...comments, [postId]: postComments });
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Space Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <SpaceIconSVG spaceId={space.id} size={40} />
            <h1 className="text-4xl text-[#2a2318]">{space.name}</h1>
          </div>
          <p className="text-lg text-[#6b5f52]">{space.description}</p>
          <p className="text-sm text-[#a0968a] mt-2">{demoMembers.filter(m => m.spacesJoined?.includes(spaceId)).length} members</p>
        </div>
        <Link href="/app/spaces">
          <Button variant="outline" size="md">
            ← Back
          </Button>
        </Link>
      </div>

      {/* People in This Space - Small Thumbnails at Top */}
      {(() => {
        const memberIds = Object.keys(demoSpaceMemberships).filter(id =>
          demoSpaceMemberships[id].includes(spaceId)
        );
        const spaceMembers = demoMembers.filter(m => memberIds.includes(m.id));
        return spaceMembers.length > 0 ? (
          <div className="flex flex-wrap gap-2 items-center bg-[#f3ede5] p-3 rounded-lg">
            <span className="text-xs font-medium text-[#6b5f52] mr-2">People:</span>
            {spaceMembers.slice(0, 12).map((member) => (
              <Link key={member.id} href={`/members/${member.id}`}>
                <div className="flex-shrink-0 group cursor-pointer" title={member.displayName}>
                  <img
                    src={member.profilePhoto}
                    alt={member.displayName}
                    className="w-6 h-6 rounded-full hover:ring-2 hover:ring-[#d4a574] transition-all"
                  />
                </div>
              </Link>
            ))}
            {spaceMembers.length > 12 && (
              <Link href={`/app/spaces/${spaceId}/members`}>
                <span className="text-xs text-[#d4a574] hover:underline font-medium">+{spaceMembers.length - 12}</span>
              </Link>
            )}
            <Link href={`/app/spaces/${spaceId}/members`} className="ml-auto">
              <span className="text-xs text-[#d4a574] hover:underline font-medium">See all</span>
            </Link>
          </div>
        ) : null;
      })()}

      {/* Space Introduction */}

      {space.id === "commons" && (
        <Card className="bg-[#f3ede5] border-l-4 border-[#d4a574]">
          <div className="space-y-4 text-[#2a2318]">
            <h2 className="text-2xl font-bold">Welcome to The Commons.</h2>

            <p className="text-[#6b5f52]">
              This is the main gathering space for the community: a place for reflections, questions, introductions, check-ins, shared insights, and the small human moments that help a room feel alive.
            </p>

            <p className="italic text-[#6b5f52]">Think of The Commons as the front room of The Connection Room — the warmer version where you can say hello, share what you are noticing, and connect with others.</p>

            <div className="pt-4 border-t border-[#d4a574]">
              <h3 className="font-bold mb-3">What to post here:</h3>
              <ul className="space-y-1 text-sm text-[#6b5f52]">
                <li>• A short introduction or what brought you here</li>
                <li>• What kind of connection you are craving more of</li>
                <li>• Something you are learning about intimacy or vulnerability</li>
                <li>• A reflection from a prompt or question you are sitting with</li>
                <li>• A small win, moment of insight, or something tender/funny</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-[#d4a574]">
              <h3 className="font-bold mb-3">How to respond:</h3>
              <p className="text-sm text-[#6b5f52] mb-2">Lead with presence. Helpful responses include:</p>
              <ul className="space-y-1 text-sm text-[#6b5f52]">
                <li>• "I relate to this."</li>
                <li>• "Thank you for sharing."</li>
                <li>• "I appreciate how honestly you said this."</li>
                <li>• "Would you like reflection, or mostly to be witnessed?"</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {space.id === "start-here" && (
        <Card className="bg-[#f3ede5] border-l-4 border-[#d4a574]">
          <div className="space-y-4 text-[#2a2318]">
            <h2 className="text-2xl font-bold">Welcome to The Connection Room by Trevor James.</h2>

            <p className="text-[#6b5f52]">
              This is a private community for men and couples who want to practice more honest connection, embodied intimacy, emotional openness, spirituality, sexuality, and integration without shame, pressure, or performance.
            </p>

            <div className="space-y-2 text-[#6b5f52]">
              <p className="font-medium">This is not a hookup space.</p>
              <p>It is not a dating app.</p>
              <p>It is not a place where you have to perform vulnerability, say something profound, or arrive fully "healed" before you belong.</p>
            </div>

            <p className="italic">Think of this as a practice room. A place to slow down, notice what is true, explore what connection brings up in you, and participate at a pace that feels honest and respectful.</p>

            <p className="text-[#6b5f52]">You are welcome here whether you are feeling open, guarded, curious, nervous, tender, skeptical, quietly hopeful, or all of the above before breakfast.</p>

            <h3 className="font-bold pt-4">Our culture</h3>
            <p className="text-sm text-[#6b5f52]">The culture here is built on consent, care, curiosity, and emotional honesty.</p>

            <ul className="space-y-2 text-sm text-[#6b5f52]">
              <li><strong>We speak from personal experience.</strong></li>
              <li><strong>We do not diagnose, fix, pressure, pursue, or perform.</strong></li>
              <li><strong>We respect different bodies, orientations, relationship structures, comfort levels, and life experiences.</strong></li>
              <li><strong>We do not use the community to cruise, solicit, or send unwanted sexual energy toward other members.</strong></li>
            </ul>

            <p className="text-[#6b5f52] font-medium pt-2">Vulnerability is welcome here, but it is never demanded.</p>

            <ul className="space-y-1 text-sm text-[#6b5f52]">
              <li>You can participate quietly at first.</li>
              <li>You can take your time.</li>
              <li>You can be thoughtful without being dramatic.</li>
              <li>You can be honest without oversharing.</li>
            </ul>

            <p className="text-[#6b5f52] font-medium pt-4">The invitation is simple:</p>
            <ul className="space-y-1 text-sm text-[#6b5f52]">
              <li>Come back to your body.</li>
              <li>Notice what is true.</li>
              <li>Practice connection with care.</li>
              <li>Let this be a place where more of you can arrive.</li>
            </ul>
          </div>
        </Card>
      )}

      {/* Featured Prompt */}
      {space.featuredPrompt && (
        <Card className="bg-gradient-to-r from-[#f3ede5] to-[#fffbf7]">
          <CardHeader title="Today's Prompt" icon={<IconReflection size={20} />} />
          <p className="text-[#6b5f52] italic text-lg mb-4">"{space.featuredPrompt}"</p>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              document.getElementById("create-post-section")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Respond to Prompt
          </Button>
        </Card>
      )}

      {/* Weekly Commons Thread */}
      {spaceId === "commons" && <WeeklyCommonsThread />}

      {/* Start Here Checklist */}
      {spaceId === "start-here" && <StartHereChecklist />}

      {/* First Week Journey Card */}
      {spaceId === "start-here" && <FirstWeekStartHereCard />}

      {/* Post Error Feedback */}
      {postError && (
        <div className="mb-4">
          <ErrorFeedback
            title="Post Failed"
            message={postError}
            onRetry={handleRetryPost}
            onDismiss={() => setPostError(null)}
            retryLoading={retryingPost}
          />
        </div>
      )}

      {/* Create Post */}
      <Card id="create-post-section">
        <CardHeader title="Share Your Thoughts" icon={<IconIntegration size={20} />} />

        {/* Template Hint */}
        <div className="mb-3 p-3 rounded-lg bg-[#f3ede5] text-sm text-[#6b5f52]">
          <p className="mb-2">Not sure where to start? <button onClick={() => setShowTemplateSelector(true)} className="text-[#d4a574] hover:underline font-medium">Choose a post template</button> to help you.</p>
        </div>

        <div className="space-y-2">
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="What's on your mind? Share authentically..."
            rows={3}
            maxLength={MAX_POST_LENGTH}
            className="w-full px-4 py-2.5 border border-[#ede6e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574] focus:ring-offset-2 focus:border-transparent transition-all duration-150 text-[#2a2318] placeholder-[#a0968a] resize-none"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-[#a0968a]">
              {newPostContent.length} / {MAX_POST_LENGTH} characters
            </p>
            {newPostContent.length > MAX_POST_LENGTH * 0.9 && (
              <p className="text-xs text-[#d4a574]">Getting close to limit</p>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button
            variant="primary"
            size="md"
            onClick={handleCreatePost}
            disabled={!newPostContent.trim() || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Posting..." : "Post"}
          </Button>
        </div>
      </Card>

      {/* Post Template Selector */}
      {showTemplateSelector && (
        <PostTemplateSelector
          onSelect={(templateId) => {
            const template = postTemplates.find((t) => t.id === templateId);
            if (template) {
              const prompts = template.starterPrompts.join("\n");
              setNewPostContent(prompts);
              setSelectedTemplate(templateId);
              setShowTemplateSelector(false);
            }
          }}
          onSkip={() => setShowTemplateSelector(false)}
        />
      )}

      {/* Posts Feed */}
      <div id="posts-feed" className="space-y-6">
        {!mounted ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonPost key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptySpaceInvitation
            spaceId={spaceId}
            onStartPost={() => {
              // Scroll to post creation
              document.getElementById("create-post-section")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        ) : (
          posts.map((post) => (
            <Card key={post.id}>
              <div className="flex items-start justify-between mb-3">
                <Link href={`/app/users/${post.userId}`} className="flex items-start gap-3 flex-1 hover:opacity-80 transition-opacity">
                  <Avatar name={post.authorName} photo={post.authorPhoto} size={40} className="cursor-pointer" />
                  <div className="cursor-pointer">
                    <p className="font-medium text-[#2a2318]">
                      {post.authorName} {post.authorPronouns && `(${post.authorPronouns})`}
                    </p>
                    <p className="text-xs text-[#a0968a]">
                      {new Date(post.createdAt).toLocaleDateString()} at{" "}
                      {new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </Link>
              </div>

              <p className="text-[#6b5f52] mb-4">{post.content}</p>

              {/* Reactions */}
              <ReactionBar
                reactions={post.reactions}
                userReaction={userReactions[post.id]}
                onReact={(reactionKey) => handleReaction(post.id, reactionKey)}
              />

              {/* Comments Toggle */}
              <button
                onClick={() => toggleExpandPost(post.id)}
                className="text-sm text-[#d4a574] hover:text-[#9d7f5c] font-medium"
              >
                Comment | {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
              </button>

              {/* Comments Section */}
              {expandedPost === post.id && (
                <div className="mt-4 pt-4 border-t border-[#e8ddd2] space-y-4">
                  {/* Existing Comments */}
                  {(comments[post.id] || []).map((comment: Comment) => (
                    <div key={comment.id} className="bg-[#f3ede5] p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Link href={`/app/users/${comment.userId}`} className="flex items-start gap-2 flex-1 hover:opacity-80 transition-opacity">
                          <Avatar name={comment.authorName} photo={comment.authorPhoto} size={28} className="cursor-pointer" />
                          <div className="flex-1 cursor-pointer">
                            <p className="text-sm font-medium text-[#2a2318]">
                              {comment.authorName} {comment.authorPronouns && `(${comment.authorPronouns})`}
                            </p>
                            <p className="text-sm text-[#6b5f52] mt-1">{comment.content}</p>
                          </div>
                        </Link>
                      </div>
                    </div>
                  ))}

                  {/* Commenting Guide */}
                  <div className="mb-3">
                    <CommentingGuideHelper compact={true} />
                  </div>

                  {/* Comment Error Feedback */}
                  {commentError[post.id] && (
                    <div className="mb-3">
                      <ErrorFeedback
                        title="Response Failed"
                        message={commentError[post.id]!}
                        onRetry={() => handleRetryComment(post.id)}
                        onDismiss={() => setCommentError({ ...commentError, [post.id]: null })}
                        retryLoading={retryingComment.has(post.id)}
                      />
                    </div>
                  )}

                  {/* Add Comment */}
                  <div className="space-y-2">
                    <textarea
                      value={newCommentContent[post.id] || ""}
                      onChange={(e) => setNewCommentContent({ ...newCommentContent, [post.id]: e.target.value })}
                      placeholder="Add your response..."
                      rows={2}
                      maxLength={MAX_COMMENT_LENGTH}
                      className="w-full px-4 py-2.5 border border-[#ede6e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574] focus:ring-offset-2 focus:border-transparent transition-all duration-150 text-sm text-[#2a2318] placeholder-[#a0968a] resize-none"
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-[#a0968a]">
                        {(newCommentContent[post.id] || "").length} / {MAX_COMMENT_LENGTH}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddComment(post.id)}
                      disabled={!newCommentContent[post.id]?.trim() || isSubmitting}
                      className="w-full"
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
