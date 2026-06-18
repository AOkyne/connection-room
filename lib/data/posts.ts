// Posts and comments data access layer - demo mode with localStorage

import { demoPosts, demoBadges } from "./demo-data";

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

// Get all posts (or posts for a specific space)
export function getPosts(spaceId?: string): Post[] {
  if (typeof window === "undefined") {
    return demoPosts;
  }

  const stored = localStorage.getItem(POSTS_STORAGE_KEY);
  const posts = stored ? JSON.parse(stored) : demoPosts;

  if (spaceId) {
    return posts.filter((p: Post) => p.spaceId === spaceId);
  }

  return posts;
}

// Get single post
export function getPost(postId: string): Post | null {
  const posts = getPosts();
  return posts.find((p) => p.id === postId) || null;
}

// Create new post
export function createPost(
  spaceId: string,
  authorName: string,
  content: string,
  isPromptResponse: boolean = false,
  promptId?: string,
  authorPronouns?: string
): Post {
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

  if (typeof window !== "undefined") {
    const posts = getPosts();
    posts.unshift(post);
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
  }

  return post;
}

// Add reaction to post
export function addPostReaction(postId: string, reactionType: string, userName: string): void {
  if (typeof window === "undefined") return;

  const posts = getPosts();
  const post = posts.find((p: Post) => p.id === postId);
  if (!post) return;

  const reactionKey = `${reactionType}|${userName}`;
  if (!post.reactions[reactionType]) {
    post.reactions[reactionType] = 0;
  }
  post.reactions[reactionType]++;

  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
}

// Get comments for a post
export function getComments(postId: string): Comment[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
  const comments = stored ? JSON.parse(stored) : [];

  return comments.filter((c: Comment) => c.postId === postId);
}

// Create comment
export function createComment(
  postId: string,
  authorName: string,
  content: string,
  authorPronouns?: string
): Comment {
  const comment: Comment = {
    id: `comment-${Date.now()}`,
    postId,
    authorName,
    authorPronouns,
    content,
    createdAt: new Date(),
    reactions: {},
  };

  if (typeof window !== "undefined") {
    const comments = getComments(postId);
    comments.push(comment);
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));

    // Increment post comment count
    const posts = getPosts();
    const post = posts.find((p: Post) => p.id === postId);
    if (post) {
      post.commentCount++;
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
    }
  }

  return comment;
}

// Add reaction to comment
export function addCommentReaction(commentId: string, reactionType: string): void {
  if (typeof window === "undefined") return;

  const postId = ""; // We'd need to store this differently in a real app
  const comments = getComments(postId);
  const comment = comments.find((c: Comment) => c.id === commentId);
  if (!comment) return;

  if (!comment.reactions[reactionType]) {
    comment.reactions[reactionType] = 0;
  }
  comment.reactions[reactionType]++;

  localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));
}
