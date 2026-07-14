"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Breadcrumb } from "@/components/Breadcrumb";
import { getSession } from "@/lib/session";

interface Post {
  id: string;
  spaceId: string;
  authorName: string;
  content: string;
  createdAt: string;
  commentCount: number;
}

interface Comment {
  id: string;
  postId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export default function ModerationPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "comments">("posts");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        setLoading(false);
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      try {
        const { data: postsData } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false });

        const { data: commentsData } = await supabase
          .from("comments")
          .select("*")
          .order("created_at", { ascending: false });

        setPosts(
          postsData?.map((p: any) => ({
            id: p.id,
            spaceId: p.space_id,
            authorName: p.author_name,
            content: p.content,
            createdAt: p.created_at,
            commentCount: p.comment_count || 0,
          })) || []
        );

        setComments(
          commentsData?.map((c: any) => ({
            id: c.id,
            postId: c.post_id,
            authorName: c.author_name,
            content: c.content,
            createdAt: c.created_at,
          })) || []
        );
      } catch (error) {
        console.error("Error loading moderation data:", error);
      }

      setLoading(false);
    };

    loadData();
  }, [router]);

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Delete this post? This will also delete all comments on it.")) {
      return;
    }

    setDeleting(postId);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      try {
        // Fallback: delete from local state
        setPosts(posts.filter((p) => p.id !== postId));
        setComments(comments.filter((c) => c.postId !== postId));
      } finally {
        setDeleting(null);
      }
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      await supabase.from("comments").delete().eq("post_id", postId);
      await supabase.from("posts").delete().eq("id", postId);

      setPosts(posts.filter((p) => p.id !== postId));
      setComments(comments.filter((c) => c.postId !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) {
      return;
    }

    setDeleting(commentId);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      try {
        setComments(comments.filter((c) => c.id !== commentId));
      } finally {
        setDeleting(null);
      }
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      await supabase.from("comments").delete().eq("id", commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="p-4">Loading moderation data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/admin">
          <button className="text-[#d4a348] hover:text-[#8b6f47] font-medium transition-colors">
            ← Back
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-[#1a0f0a]">Moderation</h1>
          <p className="text-[#a0704a] mt-2">Review and delete posts and comments</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[#e8e3db]">
        <button
          onClick={() => setTab("posts")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            tab === "posts"
              ? "border-[#d4a348] text-[#1a0f0a]"
              : "border-transparent text-[#a0704a] hover:text-[#1a0f0a]"
          }`}
        >
          Posts ({posts.length})
        </button>
        <button
          onClick={() => setTab("comments")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            tab === "comments"
              ? "border-[#d4a348] text-[#1a0f0a]"
              : "border-transparent text-[#a0704a] hover:text-[#1a0f0a]"
          }`}
        >
          Comments ({comments.length})
        </button>
      </div>

      {/* Posts Tab */}
      {tab === "posts" && (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <p className="text-[#a0704a]">No posts to moderate</p>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-[#a0704a]">
                        {post.authorName} • {post.spaceId}
                      </p>
                      <p className="text-[#1a0f0a] mt-2 line-clamp-2">{post.content}</p>
                      <p className="text-xs text-[#a0704a] mt-2">
                        {new Date(post.createdAt).toLocaleDateString()} •{" "}
                        {post.commentCount} comments
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePost(post.id)}
                      disabled={deleting === post.id}
                      className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    >
                      {deleting === post.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Comments Tab */}
      {tab === "comments" && (
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-[#a0704a]">No comments to moderate</p>
          ) : (
            comments.map((comment) => (
              <Card key={comment.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-[#a0704a]">
                        {comment.authorName} on post {comment.postId.substring(0, 8)}...
                      </p>
                      <p className="text-[#1a0f0a] mt-2 line-clamp-2">{comment.content}</p>
                      <p className="text-xs text-[#a0704a] mt-2">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={deleting === comment.id}
                      className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    >
                      {deleting === comment.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
