import { supabase } from "@/lib/supabase/client";
import { demoPosts, demoBadges } from "./demo-data";
import {
  getSupabasePosts,
  createSupabasePost,
  getSupabaseComments,
  createSupabaseComment,
  addSupabasePostReaction,
} from "./supabase-posts";

export interface Post {
  id: string;
  spaceId: string;
  authorName: string;
  authorPronouns?: string;
  promptId?: string;
  content: string;
  isPromptResponse: boolean;
  createdAt: Date;
  reactions: Record<string, number>;
  commentCount: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorName: string;
  authorPronouns?: string;
  content: string;
  createdAt: Date;
  reactions: Record<string, number>;
}

const POSTS_STORAGE_KEY = "connection-room:posts";
const COMMENTS_STORAGE_KEY = "connection-room:comments";

// Get current authenticated user ID
async function getCurrentUserId(): Promise<string | null> {
  if (typeof window === "undefined" || !supabase) return null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (err) {
    return null;
  }
}

// Get all posts (or posts for a specific space)
export async function getPosts(spaceId?: string): Promise<Post[]> {
  if (typeof window === "undefined") {
    return demoPosts;
  }

  const userId = await getCurrentUserId();
  if (userId && supabase) {
    return await getSupabasePosts(spaceId);
  }

  // Demo mode fallback
  const stored = localStorage.getItem(POSTS_STORAGE_KEY);
  const posts = stored ? JSON.parse(stored) : demoPosts;

  if (spaceId) {
    return posts.filter((p: Post) => p.spaceId === spaceId);
  }

  return posts;
}

// Get single post
export async function getPost(postId: string): Promise<Post | null> {
  const posts = await getPosts();
  return posts.find((p) => p.id === postId) || null;
}

// Create new post
export async function createPost(
  spaceId: string,
  authorName: string,
  content: string,
  isPromptResponse: boolean = false,
  promptId?: string,
  authorPronouns?: string
): Promise<Post> {
  if (typeof window === "undefined") {
    return {
      id: `post-${Date.now()}`,
      spaceId,
      authorName,
      authorPronouns,
      promptId,
      content,
      isPromptResponse,
      createdAt: new Date(),
      reactions: {},
      commentCount: 0,
    };
  }

  const userId = await getCurrentUserId();
  if (userId && supabase) {
    const post = await createSupabasePost(spaceId, userId, authorName, content, isPromptResponse, promptId);
    if (post) return post;
  }

  // Demo mode fallback
  const post: Post = {
    id: `post-${Date.now()}`,
    spaceId,
    authorName,
    authorPronouns,
    promptId,
    content,
    isPromptResponse,
    createdAt: new Date(),
    reactions: {},
    commentCount: 0,
  };

  const posts = await getPosts();
  posts.unshift(post);
  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));

  return post;
}

// Add reaction to post
export async function addPostReaction(postId: string, reactionType: string, userName: string): Promise<void> {
  if (typeof window === "undefined") return;

  const userId = await getCurrentUserId();
  if (userId && supabase) {
    await addSupabasePostReaction(postId, userId, reactionType);
    return;
  }

  // Demo mode fallback
  const posts = await getPosts();
  const post = posts.find((p: Post) => p.id === postId);
  if (!post) return;

  if (!post.reactions[reactionType]) {
    post.reactions[reactionType] = 0;
  }
  post.reactions[reactionType]++;

  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
}

// Get comments for a post
export async function getComments(postId: string): Promise<Comment[]> {
  if (typeof window === "undefined") return [];

  const userId = await getCurrentUserId();
  if (userId && supabase) {
    return await getSupabaseComments(postId);
  }

  // Demo mode fallback
  const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
  const comments = stored ? JSON.parse(stored) : [];

  return comments.filter((c: Comment) => c.postId === postId);
}

// Create comment
export async function createComment(
  postId: string,
  authorName: string,
  content: string,
  authorPronouns?: string
): Promise<Comment> {
  if (typeof window === "undefined") {
    return {
      id: `comment-${Date.now()}`,
      postId,
      authorName,
      authorPronouns,
      content,
      createdAt: new Date(),
      reactions: {},
    };
  }

  const userId = await getCurrentUserId();
  if (userId && supabase) {
    const comment = await createSupabaseComment(postId, userId, authorName, content);
    if (comment) return comment;
  }

  // Demo mode fallback
  const comment: Comment = {
    id: `comment-${Date.now()}`,
    postId,
    authorName,
    authorPronouns,
    content,
    createdAt: new Date(),
    reactions: {},
  };

  const comments = await getComments(postId);
  comments.push(comment);
  localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));

  // Increment post comment count
  const posts = await getPosts();
  const post = posts.find((p: Post) => p.id === postId);
  if (post) {
    post.commentCount++;
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
  }

  return comment;
}

// Add reaction to comment
export async function addCommentReaction(commentId: string, reactionType: string): Promise<void> {
  if (typeof window === "undefined") return;

  const userId = await getCurrentUserId();
  if (userId && supabase) {
    // Supabase will handle reactions table
    return;
  }

  // Demo mode fallback - note: this is incomplete without postId
  // In a real implementation, comments would track their postId
}
