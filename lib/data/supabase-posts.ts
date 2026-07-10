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
      console.warn("Error fetching posts:", error);
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

    // Fetch comment counts for all posts
    const { data: commentsData } = await supabase
      .from("comments")
      .select("post_id")
      .in("post_id", (data || []).map((p) => p.id));

    // Count comments by post
    const commentCountMap: Record<string, number> = {};
    (commentsData || []).forEach((comment: any) => {
      commentCountMap[comment.post_id] = (commentCountMap[comment.post_id] || 0) + 1;
    });

    return (
      data?.map((post) => {
        // Don't show photos for seeded/demo posts - use initials instead
        const authorPhoto = post.author_photo;
        const isTomSawyerPhoto = authorPhoto && (authorPhoto.includes('seed') || authorPhoto?.includes('tom'));
        return {
          id: post.id,
          spaceId: post.space_id,
          userId: post.user_id,
          authorName: post.author_name || post.user_id,
          authorPronouns: post.author_pronouns,
          // Remove Tom Sawyer's seeded photo, show real user photos only
          authorPhoto: isTomSawyerPhoto ? undefined : authorPhoto,
          promptId: post.prompt_id,
          content: post.body || post.content,
          isPromptResponse: !!post.is_prompt_response,
          createdAt: new Date(post.created_at),
          reactions: reactionsMap[post.id] || {},
          commentCount: commentCountMap[post.id] || 0,
        };
      }) || []
    );
  } catch (err) {
    console.warn("Error in getSupabasePosts:", err);
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
  promptId?: string,
  authorPronouns?: string,
  authorPhoto?: string
): Promise<Post | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        space_id: spaceId,
        author_name: authorName,
        author_pronouns: authorPronouns,
        author_photo: authorPhoto,
        prompt_id: promptId,
        content: content,
        is_prompt_response: isPromptResponse || false,
      })
      .select("*")
      .single();

    if (error) {
      console.warn("Error creating post:", error);
      console.warn("Error details - code:", error.code, "message:", error.message, "details:", error.details);
      return null;
    }

    return {
      id: data.id,
      spaceId: data.space_id,
      userId: data.user_id,
      authorName: data.author_name || data.user_id,
      authorPronouns: data.author_pronouns,
      authorPhoto: data.author_photo,
      promptId: data.prompt_id,
      content: data.content,
      isPromptResponse: !!data.is_prompt_response,
      createdAt: new Date(data.created_at),
      reactions: {},
      commentCount: data.comment_count || 0,
    };
  } catch (err) {
    console.warn("Error in createSupabasePost:", err);
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
    console.log("Adding reaction:", { postId, userId, reactionType });
    // Try to insert the reaction
    const { error } = await supabase
      .from("reactions")
      .insert({
        user_id: userId,
        post_id: postId,
        reaction_type: reactionType,
      });

    // If unique constraint violation, the reaction already exists - that's fine
    if (error && error.code === "23505") {
      console.log("Reaction already exists");
      return true;
    }

    if (error) {
      console.warn("Error adding post reaction:", error);
      console.warn("Error code:", error.code);
      console.warn("Error message:", error.message);
      return false;
    }

    console.log("Reaction added successfully");
    return true;
  } catch (err) {
    console.warn("Error in addSupabasePostReaction:", err);
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
      console.warn("Error fetching comments:", error);
      return [];
    }

    return (
      data?.map((comment) => {
        const authorPhoto = comment.author_photo;
        const isTomSawyerPhoto = authorPhoto && (authorPhoto.includes('seed') || authorPhoto.includes('tom'));
        return {
          id: comment.id,
          postId: comment.post_id,
          userId: comment.user_id,
          authorName: comment.author_name || comment.user_id,
          authorPronouns: comment.author_pronouns,
          // Remove Tom Sawyer's seeded photo, show real user photos only
          authorPhoto: isTomSawyerPhoto ? undefined : authorPhoto,
          content: comment.content,
          createdAt: new Date(comment.created_at),
          reactions: {},
        };
      }) || []
    );
  } catch (err) {
    console.warn("Error in getSupabaseComments:", err);
    return [];
  }
}

// Create comment in Supabase
export async function createSupabaseComment(
  postId: string,
  userId: string,
  authorName: string,
  content: string,
  authorPronouns?: string,
  authorPhoto?: string
): Promise<Comment | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("comments")
      .insert({
        user_id: userId,
        post_id: postId,
        author_name: authorName,
        author_pronouns: authorPronouns,
        author_photo: authorPhoto,
        content: content,
      })
      .select("*")
      .single();

    if (error) {
      console.warn("Error creating comment:", error);
      return null;
    }

    // Note: Comment count update in Supabase may fail due to RLS policies,
    // so the UI increments it optimistically instead
    try {
      const { data: post } = await supabase
        .from("posts")
        .select("id, comment_count")
        .eq("id", postId)
        .single();

      if (post) {
        await supabase
          .from("posts")
          .update({ comment_count: (post.comment_count || 0) + 1 })
          .eq("id", postId);
      }
    } catch (err) {
      // Silently ignore - count is incremented optimistically in UI
    }

    return {
      id: data.id,
      postId: data.post_id,
      userId: data.user_id,
      authorName: data.author_name || data.user_id,
      authorPronouns: data.author_pronouns,
      authorPhoto: data.author_photo,
      content: data.content,
      createdAt: new Date(data.created_at),
      reactions: {},
    };
  } catch (err) {
    console.warn("Error in createSupabaseComment:", err);
    return null;
  }
}
