"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSpace } from "@/lib/data/spaces";
import { getPosts, createPost, addPostReaction, getComments, createComment, type Post, type Comment } from "@/lib/data/posts";
import { getProfile } from "@/lib/data/profiles";
import { appConfig } from "@/lib/config";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { SpaceIconSVG } from "@/components/SpaceIconSVG";
import { StartHereChecklist } from "@/components/StartHereChecklist";
import { IconIntegration, IconReflection } from "@/components/Icons";
import Link from "next/link";

export default function SpaceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const spaceId = params.id as string;

  const [space, setSpace] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newPostContent, setNewPostContent] = useState("");
  const [newCommentContent, setNewCommentContent] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const s = await getSpace(spaceId);
      if (!s) {
        router.push("/app/spaces");
        return;
      }
      setSpace(s);

      const p = await getProfile();
      setProfile(p);

      const spacePosts = await getPosts(spaceId);
      setPosts(spacePosts);

      setMounted(true);
    };

    loadData();
  }, [spaceId, router]);

  if (!mounted || !space || !profile) {
    return <div>Loading...</div>;
  }

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;

    const newPost = await createPost(spaceId, profile.displayName, newPostContent, false, undefined, profile.pronouns, profile.profilePhoto);
    setPosts([newPost, ...posts]);
    setNewPostContent("");
  };

  const handleAddComment = async (postId: string) => {
    const content = newCommentContent[postId];
    if (!content || !content.trim()) return;

    await createComment(postId, profile.displayName, content, profile.pronouns, profile.profilePhoto);
    setNewCommentContent({ ...newCommentContent, [postId]: "" });

    // Refresh posts to show updated comment count
    const updatedPosts = await getPosts(spaceId);
    setPosts(updatedPosts);
  };

  const handleReaction = async (postId: string, reactionType: string) => {
    await addPostReaction(postId, reactionType, profile.displayName);
    const updatedPosts = await getPosts(spaceId);
    setPosts(updatedPosts);
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
          <p className="text-sm text-[#a0968a] mt-2">{space.memberCount} members</p>
        </div>
        <Link href="/app/spaces">
          <Button variant="outline" size="md">
            ← Back
          </Button>
        </Link>
      </div>

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

      {/* Featured Prompt */}
      {space.featuredPrompt && (
        <Card className="bg-gradient-to-r from-[#f3ede5] to-[#fffbf7]">
          <CardHeader title="Today's Prompt" icon={<IconReflection size={20} />} />
          <p className="text-[#6b5f52] italic text-lg mb-4">"{space.featuredPrompt}"</p>
          <Button variant="secondary" size="md">
            Respond to Prompt
          </Button>
        </Card>
      )}

      {/* Start Here Checklist */}
      {spaceId === "start-here" && <StartHereChecklist />}

      {/* Create Post */}
      <Card>
        <CardHeader title="Share Your Thoughts" icon={<IconIntegration size={20} />} />
        <textarea
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          placeholder="What's on your mind? Share authentically..."
          rows={3}
          className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a574] text-[#2a2318]"
        />
        <div className="flex gap-3 mt-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleCreatePost}
            disabled={!newPostContent.trim()}
            className="flex-1"
          >
            Post
          </Button>
        </div>
      </Card>

      {/* Posts Feed */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-[#a0968a]">No posts yet. Be the first to share.</p>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id}>
              <div className="flex items-start justify-between mb-3">
                <Link href={`/app/users/${post.userId}`} className="flex items-start gap-3 flex-1 hover:opacity-80 transition-opacity">
                  {post.authorPhoto && (
                    <img
                      src={post.authorPhoto}
                      alt={post.authorName}
                      className="w-10 h-10 rounded-full flex-shrink-0 cursor-pointer"
                    />
                  )}
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
              <div className="flex flex-wrap gap-2 mb-4">
                {appConfig.reactions.map((reaction) => {
                  const count = post.reactions[reaction.id] || 0;
                  return (
                    <button
                      key={reaction.id}
                      onClick={() => handleReaction(post.id, reaction.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        count > 0
                          ? "bg-[#d4a574] text-white hover:bg-[#c29560]"
                          : "border border-[#e8ddd2] text-[#6b5f52] hover:border-[#d4a574] hover:text-[#2a2318]"
                      }`}
                    >
                      {reaction.label} {count > 0 && <span>({count})</span>}
                    </button>
                  );
                })}
              </div>

              {/* Comments Toggle */}
              <button
                onClick={() => toggleExpandPost(post.id)}
                className="text-sm text-[#d4a574] hover:text-[#9d7f5c] font-medium"
              >
                {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
              </button>

              {/* Comments Section */}
              {expandedPost === post.id && (
                <div className="mt-4 pt-4 border-t border-[#e8ddd2] space-y-4">
                  {/* Existing Comments */}
                  {(comments[post.id] || []).map((comment: Comment) => (
                    <div key={comment.id} className="bg-[#f3ede5] p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Link href={`/app/users/${comment.userId}`} className="flex items-start gap-2 flex-1 hover:opacity-80 transition-opacity">
                          {comment.authorPhoto && (
                            <img
                              src={comment.authorPhoto}
                              alt={comment.authorName}
                              className="w-7 h-7 rounded-full flex-shrink-0 cursor-pointer"
                            />
                          )}
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

                  {/* Add Comment */}
                  <div className="space-y-2">
                    <textarea
                      value={newCommentContent[post.id] || ""}
                      onChange={(e) => setNewCommentContent({ ...newCommentContent, [post.id]: e.target.value })}
                      placeholder="Add your response..."
                      rows={2}
                      className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a574] text-sm"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddComment(post.id)}
                      disabled={!newCommentContent[post.id]?.trim()}
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
    </div>
  );
}
