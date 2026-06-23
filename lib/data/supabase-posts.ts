import { supabase } from "@/lib/supabase/client";
import type { Post, Comment } from "./posts";

// Get posts from Supabase
export async function getSupabasePosts(spaceId?: string): Promise<Post[]> {
  if (!supabase) return [];

  try {
    let query = supabase
      .from("posts")
      .select("*, profiles(display_name, pronouns, profile_photo)")
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
      data?.map((post) => {
        const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
        return {
          id: post.id,
          spaceId: post.space_id,
          userId: post.user_id,
          authorName: post.author_name || post.user_id,
          authorPronouns: post.author_pronouns || profile?.pronouns,
          authorPhoto: post.author_photo || profile?.profile_photo,
          promptId: post.prompt_id,
          content: post.content,
          isPromptResponse: !!post.is_prompt_response,
          createdAt: new Date(post.created_at),
          reactions: reactionsMap[post.id] || {},
          commentCount: post.comment_count || 0,
        };
      }) || []
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
        content: content,
        is_prompt_response: isPromptResponse || false,
      })
      .select("*, profiles(display_name, pronouns, profile_photo)")
      .single();

    if (error) {
      console.error("Error creating post:", error);
      console.error("Error details - code:", error.code, "message:", error.message, "details:", error.details);
      return null;
    }

    const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
    return {
      id: data.id,
      spaceId: data.space_id,
      userId: data.user_id,
      authorName: data.author_name || data.user_id,
      authorPronouns: profile?.pronouns,
      authorPhoto: profile?.profile_photo,
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
      console.error("Error adding post reaction:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      return false;
    }

    console.log("Reaction added successfully");
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
      .select("*, profiles(display_name, pronouns, profile_photo)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      return [];
    }

    return (
      data?.map((comment) => {
        const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
        return {
          id: comment.id,
          postId: comment.post_id,
          userId: comment.user_id,
          authorName: comment.author_name || comment.user_id,
          authorPronouns: comment.author_pronouns || profile?.pronouns,
          authorPhoto: comment.author_photo || profile?.profile_photo,
          content: comment.content,
          createdAt: new Date(comment.created_at),
          reactions: {},
        };
      }) || []
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
  content: string,
  authorPronouns?: string,
  authorPhoto?: string
): Promise<Comment | null> {
  console.log("createSupabaseComment called with postId:", postId);
  if (!supabase) {
    console.log("No supabase client");
    return null;
  }

  try {
    console.log("Inserting comment into Supabase");
    const { data, error } = await supabase
      .from("comments")
      .insert({
        user_id: userId,
        post_id: postId,
        author_name: authorName,
        content: content,
      })
      .select("*, profiles(display_name, pronouns, profile_photo)")
      .single();

    if (error) {
      console.error("Error creating comment:", error);
      console.error("Error details - code:", error.code, "message:", error.message);
      return null;
    }

    // Increment post comment count
    console.log("Fetching post for comment count - postId:", postId);
    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("comment_count")
      .eq("id", postId)
      .single();

    console.log("Post fetched:", post?.id, "current count:", post?.comment_count, "error:", fetchError?.message);

    if (post) {
      console.log("Updating comment count from", post.comment_count, "to", (post.comment_count || 0) + 1);
      const { error: updateError } = await supabase
        .from("posts")
        .update({ comment_count: (post.comment_count || 0) + 1 })
        .eq("id", postId);

      console.log("Update result - error:", updateError?.message);
      if (updateError) {
        console.error("Error updating comment count:", updateError);
      } else {
        console.log("Comment count updated successfully");
      }
    } else if (fetchError) {
      console.error("Error fetching post for comment count update:", fetchError);
    }

    const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
    return {
      id: data.id,
      postId: data.post_id,
      userId: data.user_id,
      authorName: data.author_name || data.user_id,
      authorPronouns: data.author_pronouns || profile?.pronouns,
      authorPhoto: data.author_photo || profile?.profile_photo,
      content: data.content,
      createdAt: new Date(data.created_at),
      reactions: {},
    };
  } catch (err) {
    console.error("Error in createSupabaseComment:", err);
    return null;
  }
}
