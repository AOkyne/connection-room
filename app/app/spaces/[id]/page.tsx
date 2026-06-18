"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSpace } from "@/lib/data/spaces";
import { getPosts, createPost, addPostReaction, getComments, createComment } from "@/lib/data/posts";
import { getProfile } from "@/lib/data/profiles";
import { appConfig } from "@/lib/config";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { SpaceIconSVG } from "@/components/SpaceIconSVG";
import Link from "next/link";

interface Post {
  id: string;
  spaceId: string;
  authorName: string;
  authorPronouns?: string;
  content: string;
  isPromptResponse: boolean;
  createdAt: Date;
  reactions: Record<string, number>;
  commentCount: number;
}

interface Comment {
  id: string;
  postId: string;
  authorName: string;
  authorPronouns?: string;
  content: string;
  createdAt: Date;
  reactions: Record<string, number>;
}

export default function SpaceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const spaceId = params.id as string;

  const [space, setSpace] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState("");
  const [newCommentContent, setNewCommentContent] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setMounted(true);
    const s = getSpace(spaceId);
    if (!s) {
      router.push("/app/spaces");
      return;
    }
    setSpace(s);

    const p = getProfile();
    setProfile(p);

    const spacePosts = getPosts(spaceId);
    setPosts(spacePosts);
  }, [spaceId, router]);

  if (!mounted || !space || !profile) {
    return <div>Loading...</div>;
  }

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;

    const newPost = createPost(spaceId, profile.displayName, newPostContent, false, undefined, profile.pronouns);
    setPosts([newPost, ...posts]);
    setNewPostContent("");
  };

  const handleAddComment = (postId: string) => {
    const content = newCommentContent[postId];
    if (!content || !content.trim()) return;

    createComment(postId, profile.displayName, content, profile.pronouns);
    setNewCommentContent({ ...newCommentContent, [postId]: "" });

    // Refresh posts to show updated comment count
    const updatedPosts = getPosts(spaceId);
    setPosts(updatedPosts);
  };

  const handleReaction = (postId: string, reactionType: string) => {
    addPostReaction(postId, reactionType, profile.displayName);
    const updatedPosts = getPosts(spaceId);
    setPosts(updatedPosts);
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

      {/* Featured Prompt */}
      {space.featuredPrompt && (
        <Card className="bg-gradient-to-r from-[#f3ede5] to-[#fffbf7]">
          <CardHeader title="Today's Prompt" icon="💭" />
          <p className="text-[#6b5f52] italic text-lg mb-4">"{space.featuredPrompt}"</p>
          <Button variant="secondary" size="md">
            Respond to Prompt
          </Button>
        </Card>
      )}

      {/* Create Post */}
      <Card>
        <CardHeader title="Share Your Thoughts" icon="✨" />
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
                <div>
                  <p className="font-medium text-[#2a2318]">
                    {post.authorName} {post.authorPronouns && `(${post.authorPronouns})`}
                  </p>
                  <p className="text-xs text-[#a0968a]">
                    {new Date(post.createdAt).toLocaleDateString()} at{" "}
                    {new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
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
                onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                className="text-sm text-[#d4a574] hover:text-[#9d7f5c] font-medium"
              >
                {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
              </button>

              {/* Comments Section */}
              {expandedPost === post.id && (
                <div className="mt-4 pt-4 border-t border-[#e8ddd2] space-y-4">
                  {/* Existing Comments */}
                  {getComments(post.id).map((comment: Comment) => (
                    <div key={comment.id} className="bg-[#f3ede5] p-3 rounded-lg">
                      <p className="text-sm font-medium text-[#2a2318]">
                        {comment.authorName} {comment.authorPronouns && `(${comment.authorPronouns})`}
                      </p>
                      <p className="text-sm text-[#6b5f52] mt-1">{comment.content}</p>
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
