import { supabase } from "@/lib/supabase/client";
import { demoPosts, demoBadges } from "./demo-data";
import {
  getSupabasePosts,
  createSupabasePost,
  getSupabaseComments,
  createSupabaseComment,
  addSupabasePostReaction,
} from "./supabase-posts";
import { migrateOldReactionKey } from "@/lib/content/reactions";

export interface Post {
  id: string;
  spaceId: string;
  userId: string;
  authorName: string;
  authorPronouns?: string;
  authorPhoto?: string;
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
  userId: string;
  authorName: string;
  authorPronouns?: string;
  authorPhoto?: string;
  content: string;
  createdAt: Date;
  reactions: Record<string, number>;
}

const POSTS_STORAGE_KEY = "connection-room:posts";
const COMMENTS_STORAGE_KEY = "connection-room:comments";
const USER_REACTIONS_KEY = "connection-room:user-reactions"; // Stores user's selected reaction per post

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

// Helper: Migrate old reaction keys to new ones in the reactions object
function migrateReactions(reactions: Record<string, number>): Record<string, number> {
  const migratedReactions: Record<string, number> = {};

  for (const [key, count] of Object.entries(reactions)) {
    const newKey = migrateOldReactionKey(key);
    migratedReactions[newKey] = (migratedReactions[newKey] || 0) + count;
  }

  return migratedReactions;
}

// Get user's selected reaction for a post (demo mode)
export function getUserReactionForPost(postId: string): string | null {
  if (typeof window === "undefined") return null;

  const userReactions = JSON.parse(localStorage.getItem(USER_REACTIONS_KEY) || "{}");
  return userReactions[postId] || null;
}

// Set user's selected reaction for a post (demo mode)
function setUserReactionForPost(postId: string, reactionKey: string | null): void {
  if (typeof window === "undefined") return;

  const userReactions = JSON.parse(localStorage.getItem(USER_REACTIONS_KEY) || "{}");
  if (reactionKey === null) {
    delete userReactions[postId];
  } else {
    userReactions[postId] = reactionKey;
  }
  localStorage.setItem(USER_REACTIONS_KEY, JSON.stringify(userReactions));
}

// Get all posts from Supabase or demo data (or posts for a specific space)
export async function getPosts(spaceId?: string): Promise<Post[]> {
  if (typeof window === "undefined") {
    return demoPosts;
  }

  const userId = await getCurrentUserId();
  if (userId && supabase) {
    const posts = await getSupabasePosts(spaceId);
    // Migrate old reactions in Supabase posts
    return posts.map((p) => ({
      ...p,
      reactions: migrateReactions(p.reactions),
    }));
  }

  // Demo mode fallback
  const stored = localStorage.getItem(POSTS_STORAGE_KEY);
  let posts = stored ? JSON.parse(stored) : demoPosts;

  // Migrate old reactions
  posts = posts.map((p: Post) => ({
    ...p,
    reactions: migrateReactions(p.reactions),
  }));

  if (spaceId) {
    posts = posts.filter((p: Post) => p.spaceId === spaceId);
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
  authorPronouns?: string,
  authorPhoto?: string
): Promise<Post> {
  if (typeof window === "undefined") {
    return {
      id: `post-${Date.now()}`,
      userId: `user-demo-${Date.now()}`,
      spaceId,
      authorName,
      authorPronouns,
      authorPhoto,
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
    const post = await createSupabasePost(spaceId, userId, authorName, content, isPromptResponse, promptId, authorPronouns, authorPhoto);
    if (post) return post;
  }

  // Demo mode fallback
  const post: Post = {
    id: `post-${Date.now()}`,
    userId: `user-demo-${Date.now()}`,
    spaceId,
    authorName,
    authorPronouns,
    authorPhoto,
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
  const currentReaction = getUserReactionForPost(postId);

  // Determine new selection (toggle on/off)
  const newSelection = currentReaction === reactionType ? null : reactionType;

  // Save to localStorage immediately (works in both demo and production modes)
  setUserReactionForPost(postId, newSelection);

  if (userId && supabase) {
    await addSupabasePostReaction(postId, userId, reactionType);
    return;
  }

  // Demo mode fallback - also update post reaction counts
  const posts = await getPosts();
  const post = posts.find((p: Post) => p.id === postId);
  if (!post) return;

  // If clicking the same reaction, remove it (toggle off)
  if (currentReaction === reactionType) {
    if (post.reactions[reactionType] > 0) {
      post.reactions[reactionType]--;
    }
  } else {
    // If user had a previous reaction, decrement it
    if (currentReaction && post.reactions[currentReaction] > 0) {
      post.reactions[currentReaction]--;
    }

    // Increment the new reaction
    if (!post.reactions[reactionType]) {
      post.reactions[reactionType] = 0;
    }
    post.reactions[reactionType]++;
  }

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
  authorPronouns?: string,
  authorPhoto?: string
): Promise<Comment> {
  if (typeof window === "undefined") {
    return {
      id: `comment-${Date.now()}`,
      postId,
      userId: `user-demo-${Date.now()}`,
      authorName,
      authorPronouns,
      authorPhoto,
      content,
      createdAt: new Date(),
      reactions: {},
    };
  }

  const userId = await getCurrentUserId();
  if (userId && supabase) {
    const comment = await createSupabaseComment(postId, userId, authorName, content, authorPronouns, authorPhoto);
    if (comment) return comment;
  }

  // Demo mode fallback
  const comment: Comment = {
    id: `comment-${Date.now()}`,
    postId,
    userId: `user-demo-${Date.now()}`,
    authorName,
    authorPronouns,
    authorPhoto,
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
    post.commentCount = (post.commentCount || 0) + 1;
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

// Get user's engagement stats (posts shared, comments received, comments offered, etc)
export async function getUserEngagementStats(userId: string): Promise<{ postsShared: number; responsesReceived: number; commentsOffered: number }> {
  if (typeof window === "undefined") {
    return { postsShared: 0, responsesReceived: 0, commentsOffered: 0 };
  }

  // Get all posts and comments
  const posts = await getPosts();
  const userPosts = posts.filter((p: Post) => p.userId === userId);

  // Count total responses (comments on their posts)
  let totalResponses = 0;
  userPosts.forEach((post: Post) => {
    totalResponses += post.commentCount || 0;
  });

  // Count comments user has made on other posts
  let commentsOffered = 0;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
    const allComments = stored ? JSON.parse(stored) : [];
    commentsOffered = allComments.filter((c: Comment) => c.userId === userId).length;
  }

  return {
    postsShared: userPosts.length,
    responsesReceived: totalResponses,
    commentsOffered: commentsOffered,
  };
}
