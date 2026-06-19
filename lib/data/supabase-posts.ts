import { supabase } from "@/lib/supabase/client";
import type { Post, Comment } from "./posts";

// Get posts from Supabase
export async function getSupabasePosts(spaceId?: string): Promise<Post[]> {
  if (!supabase) return [];

  try {
    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (spaceId) {
      query = query.eq("space_id", spaceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching posts:", error);
      return [];
    }

    // Fetch reactions for all posts
    const { data: reactionsData } = await supabase
      .from("reactions")
      .select("post_id, reaction_type")
      .in("post_id", (data || []).map((p) => p.id));

    // Aggregate reactions by post and type
    const reactionsMap: Record<string, Record<string, number>> = {};
    (reactionsData || []).forEach((reaction: any) => {
      if (!reactionsMap[reaction.post_id]) {
        reactionsMap[reaction.post_id] = {};
      }
      const type = reaction.reaction_type;
      reactionsMap[reaction.post_id][type] = (reactionsMap[reaction.post_id][type] || 0) + 1;
    });

    return (
      data?.map((post) => ({
        id: post.id,
        spaceId: post.space_id,
        authorName: post.author_name || post.user_id,
        promptId: post.prompt_id,
        content: post.content,
        isPromptResponse: !!post.is_prompt_response,
        createdAt: new Date(post.created_at),
        reactions: reactionsMap[post.id] || {},
        commentCount: post.comment_count || 0,
      })) || []
    );
  } catch (err) {
    console.error("Error in getSupabasePosts:", err);
    return [];
  }
}

// Create post in Supabase
export async function createSupabasePost(
  spaceId: string,
  userId: string,
  authorName: string,
  content: string,
  isPromptResponse: boolean = false,
  promptId?: string
): Promise<Post | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        space_id: spaceId,
        author_name: authorName,
        content: content,
        is_prompt_response: isPromptResponse || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating post:", error);
      console.error("Error details - code:", error.code, "message:", error.message, "details:", error.details);
      return null;
    }

    return {
      id: data.id,
      spaceId: data.space_id,
      authorName: data.author_name || data.user_id,
      promptId: data.prompt_id,
      content: data.content,
      isPromptResponse: !!data.is_prompt_response,
      createdAt: new Date(data.created_at),
      reactions: {},
      commentCount: data.comment_count || 0,
    };
  } catch (err) {
    console.error("Error in createSupabasePost:", err);
    return null;
  }
}

// Add reaction to post in Supabase
export async function addSupabasePostReaction(
  postId: string,
  userId: string,
  reactionType: string
): Promise<boolean> {
  if (!supabase) return false;

  try {
    // First, delete any existing reaction for this user/post
    await supabase
      .from("reactions")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);

    // Then insert the new reaction
    const { error } = await supabase
      .from("reactions")
      .insert({
        user_id: userId,
        post_id: postId,
        reaction_type: reactionType,
      });

    if (error) {
      console.error("Error adding post reaction:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error in addSupabasePostReaction:", err);
    return false;
  }
}

// Get comments for a post from Supabase
export async function getSupabaseComments(postId: string): Promise<Comment[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      return [];
    }

    return (
      data?.map((comment) => ({
        id: comment.id,
        postId: comment.post_id,
        authorName: comment.author_name || comment.user_id,
        content: comment.content,
        createdAt: new Date(comment.created_at),
        reactions: {},
      })) || []
    );
  } catch (err) {
    console.error("Error in getSupabaseComments:", err);
    return [];
  }
}

// Create comment in Supabase
export async function createSupabaseComment(
  postId: string,
  userId: string,
  authorName: string,
  content: string
): Promise<Comment | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("comments")
      .insert({
        user_id: userId,
        post_id: postId,
        author_name: authorName,
        content: content,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating comment:", error);
      console.error("Error details - code:", error.code, "message:", error.message);
      return null;
    }

    return {
      id: data.id,
      postId: data.post_id,
      authorName: data.author_name || data.user_id,
      content: data.content,
      createdAt: new Date(data.created_at),
      reactions: {},
    };
  } catch (err) {
    console.error("Error in createSupabaseComment:", err);
    return null;
  }
}
