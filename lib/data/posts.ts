import { supabase } from "@/lib/supabase/client";
import { demoPosts, demoBadges, demoComments } from "./demo-data";
import {
  getSupabasePosts,
  getSupabasePostById,
  createSupabasePost,
  getSupabaseComments,
  createSupabaseComment,
  createSupabaseReply,
  softDeleteSupabaseComment,
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
  title?: string;
  content: string;
  isPromptResponse: boolean;
  // Set on the current week's auto-posted "Question of the Week" (see
  // migration 073) -- at most one pinned post per space at a time.
  pinned?: boolean;
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
  // Threading (migration 087). parentCommentId is the comment being
  // directly replied to; undefined means top-level. rootCommentId is the
  // top-level ancestor of the whole thread (undefined for top-level
  // comments themselves) -- group by rootCommentId ?? id to render a
  // thread, and render everything with parentCommentId set at a single
  // reply indent level, regardless of how deep the actual reply chain is.
  parentCommentId?: string;
  rootCommentId?: string;
  // Set when a comment with live replies was removed -- body is cleared
  // server-side; render "This comment has been removed." instead of
  // content for these rows, but keep rendering their replies normally.
  deletedAt?: Date;
}

// Groups a flat comment array into threads: each top-level comment
// (parentCommentId undefined) paired with every reply that shares its
// root, sorted oldest-first within each group. A reply-to-a-reply is
// still grouped under the SAME top-level ancestor as its parent -- this
// is what keeps rendering to exactly 2 visual levels (top-level response,
// one reply level) regardless of how deep the actual parentCommentId
// chain goes, since the caller renders every entry in a group's `replies`
// array at a single indent level.
export function groupCommentsIntoThreads(comments: Comment[]): Array<{ topLevel: Comment; replies: Comment[] }> {
  const topLevel = comments.filter((c) => !c.parentCommentId);
  const repliesByRoot = new Map<string, Comment[]>();

  comments
    .filter((c) => c.parentCommentId)
    .forEach((c) => {
      const rootId = c.rootCommentId || c.parentCommentId!;
      if (!repliesByRoot.has(rootId)) repliesByRoot.set(rootId, []);
      repliesByRoot.get(rootId)!.push(c);
    });

  return topLevel.map((comment) => ({
    topLevel: comment,
    replies: (repliesByRoot.get(comment.id) || []).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
  }));
}

const POSTS_STORAGE_KEY = "connection-room:posts";
const COMMENTS_STORAGE_KEY = "connection-room:comments";
const USER_REACTIONS_KEY = "connection-room:user-reactions"; // Stores user's selected reaction per post
const DELETED_POSTS_KEY = "connection-room:deleted-posts"; // Track deleted post IDs

// Real posts/comments get a Supabase-generated UUID; the demo/offline
// fallback path (createPost/createComment when Supabase was unavailable)
// instead used "post-<timestamp>"/"comment-<timestamp>" ids. posts.id and
// comments.id are UUID columns, so attempting a Supabase delete with one
// of these legacy ids throws a Postgres type-cast error (22P02) rather
// than just matching zero rows -- check first and skip straight to
// localStorage cleanup for these.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // Get deleted post IDs
  const deletedPostsStored = localStorage.getItem(DELETED_POSTS_KEY);
  const deletedPostIds = deletedPostsStored ? JSON.parse(deletedPostsStored) : [];

  // Try to fetch from Supabase first (includes user-created posts)
  let posts = demoPosts;

  if (supabase) {
    try {
      const supabasePosts = await getSupabasePosts(spaceId);
      // If we got real posts from Supabase, combine with demo data
      if (supabasePosts && supabasePosts.length > 0) {
        console.log("Using Supabase posts:", supabasePosts.length);
        posts = supabasePosts;
      } else {
        console.log("Supabase returned empty, using demo data");
      }
    } catch (err) {
      console.warn("Error fetching from Supabase, using demo data:", err);
    }
  }

  // Check localStorage for user-created posts
  const stored = localStorage.getItem(POSTS_STORAGE_KEY);
  if (stored) {
    try {
      const storedPosts = JSON.parse(stored);
      posts = [...posts, ...storedPosts];
    } catch (err) {
      console.warn("Could not parse stored posts");
    }
  }

  // Deduplicate by ID
  const postMap = new Map<string, Post>();
  posts.forEach(post => {
    postMap.set(post.id, post);
  });
  posts = Array.from(postMap.values());

  // Filter out deleted posts
  posts = posts.filter((p: Post) => !deletedPostIds.includes(p.id));

  // Migrate old reactions
  posts = posts.map((p: Post) => ({
    ...p,
    reactions: migrateReactions(p.reactions),
  }));

  if (spaceId) {
    posts = posts.filter((p: Post) => p.spaceId === spaceId);
  }

  // getSupabasePosts() already orders newest-first, but merging in
  // localStorage-only posts (demo/offline-created) just appends them at
  // the end regardless of their actual date, so re-sort explicitly rather
  // than relying on merge order.
  posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return posts;
}

// Get single post
export async function getPost(postId: string): Promise<Post | null> {
  const posts = await getPosts();
  return posts.find((p) => p.id === postId) || null;
}

// Get a single post directly by id (a real Supabase lookup, not a filter
// over getPosts()'s full list+demo-merge) -- used by the post-detail
// deep-link page, which needs to distinguish "doesn't exist"/"wrong
// space" from every other post in the space. Falls back to the
// demo/local getPost() path when Supabase isn't available.
export async function getPostById(postId: string): Promise<Post | null> {
  if (typeof window === "undefined") return getPost(postId);

  const userId = await getCurrentUserId();
  if (userId && supabase) {
    const post = await getSupabasePostById(postId);
    if (post) return post;
  }

  return getPost(postId);
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
    const post = await createSupabasePost(spaceId, userId, authorName, content, promptId, authorPronouns, authorPhoto);
    if (post) return post;
    // A real, signed-in member's post failed to reach Supabase and is
    // about to silently fall back to localStorage (invisible to every
    // other member). createSupabasePost() already logged the underlying
    // error -- this just makes the fallback itself loud, since the last
    // time this triggered silently (content vs body column mismatch), it
    // went unnoticed for who knows how long.
    console.warn("createPost: Supabase write failed for a real user, falling back to localStorage -- this post will not be visible to other members.");
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

  // Start with demo comments
  let allComments = [...demoComments];

  const userId = await getCurrentUserId();
  if (userId && supabase) {
    try {
      const supabaseComments = await getSupabaseComments(postId);
      // If we got real comments from Supabase, use those instead of demo
      if (supabaseComments && supabaseComments.length > 0) {
        console.log("Using Supabase comments:", supabaseComments.length);
        allComments = supabaseComments;
      } else {
        console.log("Supabase returned empty comments, using demo data");
      }
    } catch (err) {
      console.warn("Error fetching from Supabase, using demo data:", err);
    }
  }

  // Add stored comments (user-created in demo mode)
  const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
  if (stored) {
    try {
      const storedComments = JSON.parse(stored);
      allComments = [...allComments, ...storedComments];
    } catch (err) {
      console.warn("Could not parse stored comments");
    }
  }

  // Deduplicate by ID (stored comments take precedence)
  const commentMap = new Map<string, Comment>();
  allComments.forEach(comment => {
    commentMap.set(comment.id, comment);
  });

  const deduplicatedComments = Array.from(commentMap.values());
  return deduplicatedComments.filter((c: Comment) => c.postId === postId);
}

// Create comment (top-level response to a post)
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
    console.warn("createComment: Supabase write failed for a real user, falling back to localStorage -- this comment will not be visible to other members.");
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

// Reply to a top-level comment or to an existing reply. Real (Supabase)
// members only -- unlike createComment, there's no meaningful demo/
// localStorage fallback for a reply, since threading requires resolving
// the parent's real root_comment_id server-side.
export async function createReply(
  postId: string,
  parentCommentId: string,
  authorName: string,
  content: string,
  authorPronouns?: string,
  authorPhoto?: string
): Promise<Comment | null> {
  if (typeof window === "undefined") return null;

  const userId = await getCurrentUserId();
  if (!userId || !supabase) {
    console.warn("createReply: requires a signed-in Supabase session.");
    return null;
  }

  const reply = await createSupabaseReply(postId, parentCommentId, userId, authorName, content, authorPronouns, authorPhoto);
  if (!reply) {
    console.warn("createReply: Supabase write failed.");
  }
  return reply;
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

  // Get raw post data without reaction migration for faster counting
  const stored = localStorage.getItem(POSTS_STORAGE_KEY);
  const posts = stored ? JSON.parse(stored) : demoPosts;

  // Count user's posts and their responses (comments)
  let postsShared = 0;
  let totalResponses = 0;

  posts.forEach((post: any) => {
    if (post.userId === userId) {
      postsShared++;
      totalResponses += post.commentCount || 0;
    }
  });

  // Count comments user has made
  let commentsOffered = 0;
  const commentsStored = localStorage.getItem(COMMENTS_STORAGE_KEY);
  const allComments = commentsStored ? JSON.parse(commentsStored) : demoComments;
  commentsOffered = allComments.filter((c: any) => c.userId === userId).length;

  return {
    postsShared,
    responsesReceived: totalResponses,
    commentsOffered,
  };
}

// Update post content
export async function updatePost(postId: string, content: string): Promise<void> {
  if (typeof window === "undefined") return;

  if (supabase) {
    try {
      // posts' actual text column is `body`, not `content` (see Comment
      // interface's `content` -- that's this app's TS-side field name,
      // mapped to/from the DB's `body` everywhere else in this file).
      // This previously wrote to a nonexistent `content` column, so
      // "edit post" silently no-op'd against Supabase every time.
      const { error } = await supabase
        .from("posts")
        .update({ body: content, updated_at: new Date() })
        .eq("id", postId);

      if (error) throw error;
      return;
    } catch (err) {
      console.error("Error updating post:", err);
    }
  }

  // Demo mode fallback
  const stored = localStorage.getItem(POSTS_STORAGE_KEY);
  const posts = stored ? JSON.parse(stored) : demoPosts;
  const updatedPosts = posts.map((p: Post) =>
    p.id === postId ? { ...p, content } : p
  );
  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updatedPosts));
}

// Delete post and its comments. Previously this silently "succeeded" even
// when nothing was actually deleted: Supabase RLS blocks a DELETE by
// filtering it to zero matching rows rather than raising an error (so
// admin-deleting someone else's post -- there was no admin-bypass DELETE
// policy -- looked identical to a real success), and separately, if the
// post only ever existed in localStorage (leftover test/demo data) the
// Supabase branch would run, match nothing, and return early without ever
// reaching the localStorage cleanup below. Both looked like "deleted" in
// the UI (optimistic local state update) but the post reappeared on the
// next fetch either way.
export async function deletePost(postId: string): Promise<void> {
  if (typeof window === "undefined") return;

  if (supabase && UUID_RE.test(postId)) {
    const { error: commentsError } = await supabase.from("comments").delete().eq("post_id", postId);
    if (commentsError) console.error("Error deleting post's comments:", commentsError);

    const { data: deletedRows, error: postError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .select("id");

    if (postError) {
      console.error("Error deleting post:", postError);
      throw postError;
    }

    // A real post that exists but didn't come back deleted means RLS
    // silently filtered the delete to zero rows -- no error, but nothing
    // actually happened either. Surface that as a real failure rather than
    // reporting success.
    if (!deletedRows || deletedRows.length === 0) {
      throw new Error("Post not deleted -- you may not have permission to delete this post.");
    }
  }

  // Always also clean up any localStorage copy, regardless of whether the
  // Supabase branch above ran or found anything -- a locally-created
  // demo/test post never existed in Supabase at all, so its only copy is
  // here.
  const stored = localStorage.getItem(POSTS_STORAGE_KEY);
  if (stored) {
    const posts = JSON.parse(stored);
    const updatedPosts = posts.filter((p: Post) => p.id !== postId);
    if (updatedPosts.length !== posts.length) {
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updatedPosts));
    }
  }

  const commentsStored = localStorage.getItem(COMMENTS_STORAGE_KEY);
  if (commentsStored) {
    const comments = JSON.parse(commentsStored);
    const updatedComments = comments.filter((c: Comment) => c.postId !== postId);
    if (updatedComments.length !== comments.length) {
      localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(updatedComments));
    }
  }

  // Track deleted post ID so demo/seed data doesn't bring it back either.
  const deletedPostsStored = localStorage.getItem(DELETED_POSTS_KEY);
  const deletedPostIds = deletedPostsStored ? JSON.parse(deletedPostsStored) : [];
  if (!deletedPostIds.includes(postId)) {
    deletedPostIds.push(postId);
    localStorage.setItem(DELETED_POSTS_KEY, JSON.stringify(deletedPostIds));
  }
}

// Update comment content
export async function updateComment(commentId: string, content: string): Promise<void> {
  if (typeof window === "undefined") return;

  if (supabase) {
    try {
      // Same fix as updatePost -- comments' actual text column is `body`.
      const { error } = await supabase
        .from("comments")
        .update({ body: content, updated_at: new Date() })
        .eq("id", commentId);

      if (error) throw error;
      return;
    } catch (err) {
      console.error("Error updating comment:", err);
    }
  }

  // Demo mode fallback
  const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
  const comments = stored ? JSON.parse(stored) : demoComments;
  const updatedComments = comments.map((c: Comment) =>
    c.id === commentId ? { ...c, content } : c
  );
  localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(updatedComments));
}

// Delete comment. Same fix as deletePost: verify a row was actually
// removed/changed (RLS silently matches zero rows rather than erroring)
// and always also clean up any localStorage copy instead of returning
// early.
//
// A comment with live replies underneath it is soft-deleted instead of
// hard-deleted (migration 087's parent_comment_id/root_comment_id FKs
// are ON DELETE SET NULL, not CASCADE, specifically so a hard delete here
// never silently orphans/vaporizes those replies) -- the UI renders
// "This comment has been removed." for a deletedAt row while its replies
// keep rendering normally. A leaf comment (no replies) keeps today's
// hard-delete behavior unchanged.
export async function deleteComment(commentId: string): Promise<void> {
  if (typeof window === "undefined") return;

  if (supabase && UUID_RE.test(commentId)) {
    const { data: children } = await supabase
      .from("comments")
      .select("id")
      .eq("parent_comment_id", commentId)
      .limit(1);

    if (children && children.length > 0) {
      const ok = await softDeleteSupabaseComment(commentId);
      if (!ok) {
        throw new Error("Comment not removed -- you may not have permission to remove this comment.");
      }
      // Soft-deleted comments stay in place (with replies intact), so
      // there's no localStorage/deleted-tracking cleanup to do -- return
      // here rather than falling into the hard-delete cleanup below.
      return;
    }

    const { data: deletedRows, error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .select("id");

    if (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }

    if (!deletedRows || deletedRows.length === 0) {
      throw new Error("Comment not deleted -- you may not have permission to delete this comment.");
    }
  }

  const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
  if (stored) {
    const comments = JSON.parse(stored);
    const updatedComments = comments.filter((c: Comment) => c.id !== commentId);
    if (updatedComments.length !== comments.length) {
      localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(updatedComments));
    }
  }
}
