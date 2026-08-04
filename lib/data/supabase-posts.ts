import { supabase } from "@/lib/supabase/client";
import { demoSafeWrite } from "@/lib/demo/demo-mode-guard";
import type { Post, Comment } from "./posts";

// Get a single post by id, regardless of space -- used by the post-detail
// deep-link page, which needs one post plus its own space_id to verify
// against the route's [id] segment (getSupabasePosts always requires
// filtering by/knowing the space already).
export async function getSupabasePostById(postId: string): Promise<Post | null> {
  if (!supabase) return null;

  try {
    const { data: post, error } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
    if (error || !post) {
      if (error) console.warn("Error fetching post by id:", error);
      return null;
    }

    const { data: reactionsData } = await supabase.from("reactions").select("reaction_type").eq("post_id", postId);
    const reactions: Record<string, number> = {};
    (reactionsData || []).forEach((r: any) => {
      reactions[r.reaction_type] = (reactions[r.reaction_type] || 0) + 1;
    });

    const { count: commentCount } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);

    const authorPhoto = post.author_photo;
    const isTomSawyerPhoto = authorPhoto && (authorPhoto.includes("seed") || authorPhoto.includes("tom"));

    return {
      id: post.id,
      spaceId: post.space_id,
      userId: post.user_id,
      authorName: post.author_name || post.user_id,
      authorPronouns: post.author_pronouns,
      authorPhoto: isTomSawyerPhoto ? undefined : authorPhoto,
      promptId: post.prompt_id,
      title: post.title || undefined,
      content: post.body,
      isPromptResponse: !!post.prompt_id,
      pinned: !!post.pinned,
      createdAt: new Date(post.created_at),
      reactions,
      commentCount: commentCount || 0,
    };
  } catch (err) {
    console.warn("Error in getSupabasePostById:", err);
    return null;
  }
}

// Get posts from Supabase
export async function getSupabasePosts(spaceId?: string): Promise<Post[]> {
  if (!supabase) return [];

  try {
    let query = supabase
      .from("posts")
      .select("*")
      .order("pinned", { ascending: false })
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
          title: post.title || undefined,
          content: post.body,
          isPromptResponse: !!post.prompt_id,
          pinned: !!post.pinned,
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
  promptId?: string,
  authorPronouns?: string,
  authorPhoto?: string
): Promise<Post | null> {
  if (!supabase) return null;
  const client = supabase;

  try {
    const { data, error } = await demoSafeWrite(
      () => client
        .from("posts")
        .insert({
          user_id: userId,
          space_id: spaceId,
          author_name: authorName,
          author_pronouns: authorPronouns,
          author_photo: authorPhoto,
          prompt_id: promptId,
          body: content,
        })
        .select("*")
        .single(),
      { context: "createSupabasePost" }
    );

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
      content: data.body,
      isPromptResponse: !!data.prompt_id,
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
  const client = supabase;

  try {
    console.log("Adding reaction:", { postId, userId, reactionType });
    // Try to insert the reaction with demo mode protection
    const { error } = await demoSafeWrite(
      () => client
        .from("reactions")
        .insert({
          user_id: userId,
          post_id: postId,
          reaction_type: reactionType,
        }),
      { context: "addSupabasePostReaction" }
    );

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
        // A soft-deleted comment (migration 087) keeps its row -- and any
        // replies underneath it -- but its body is cleared server-side;
        // the UI renders a neutral placeholder for deletedAt rows instead
        // of blank content.
        return {
          id: comment.id,
          postId: comment.post_id,
          userId: comment.user_id,
          authorName: comment.author_name || comment.user_id,
          authorPronouns: comment.author_pronouns,
          // Remove Tom Sawyer's seeded photo, show real user photos only
          authorPhoto: isTomSawyerPhoto ? undefined : authorPhoto,
          content: comment.body,
          parentCommentId: comment.parent_comment_id || undefined,
          rootCommentId: comment.root_comment_id || undefined,
          deletedAt: comment.deleted_at ? new Date(comment.deleted_at) : undefined,
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
  const client = supabase;

  try {
    const { data, error } = await demoSafeWrite(
      () => client
        .from("comments")
        .insert({
          user_id: userId,
          post_id: postId,
          author_name: authorName,
          author_pronouns: authorPronouns,
          author_photo: authorPhoto,
          body: content,
        })
        .select("*")
        .single(),
      { context: "createSupabaseComment" }
    );

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
        await demoSafeWrite(
          () => client
            .from("posts")
            .update({ comment_count: (post.comment_count || 0) + 1 })
            .eq("id", postId),
          { context: "updatePostCommentCount" }
        );
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
      content: data.body,
      createdAt: new Date(data.created_at),
      reactions: {},
    };
  } catch (err) {
    console.warn("Error in createSupabaseComment:", err);
    return null;
  }
}

// Reply to a top-level comment or to an existing reply. root_comment_id
// is resolved app-side (not by a trigger, see migration 087): if the
// comment being replied to is itself a reply, reuse ITS root; otherwise
// the root is that comment's own id. This is what lets CommentThread
// render every reply in a thread -- however many hops deep the actual
// parent_comment_id chain goes -- at a single visual indent level.
export async function createSupabaseReply(
  postId: string,
  parentCommentId: string,
  userId: string,
  authorName: string,
  content: string,
  authorPronouns?: string,
  authorPhoto?: string
): Promise<Comment | null> {
  if (!supabase) return null;
  const client = supabase;

  try {
    const { data: parent, error: parentError } = await client
      .from("comments")
      .select("id, root_comment_id")
      .eq("id", parentCommentId)
      .maybeSingle();

    if (parentError || !parent) {
      console.warn("Error resolving parent comment for reply:", parentError);
      return null;
    }

    const rootCommentId = parent.root_comment_id || parent.id;

    const { data, error } = await demoSafeWrite(
      () => client
        .from("comments")
        .insert({
          user_id: userId,
          post_id: postId,
          parent_comment_id: parentCommentId,
          root_comment_id: rootCommentId,
          author_name: authorName,
          author_pronouns: authorPronouns,
          author_photo: authorPhoto,
          body: content,
        })
        .select("*")
        .single(),
      { context: "createSupabaseReply" }
    );

    if (error) {
      console.warn("Error creating reply:", error);
      return null;
    }

    try {
      const { data: post } = await client.from("posts").select("id, comment_count").eq("id", postId).single();
      if (post) {
        await demoSafeWrite(
          () => client.from("posts").update({ comment_count: (post.comment_count || 0) + 1 }).eq("id", postId),
          { context: "updatePostCommentCountForReply" }
        );
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
      content: data.body,
      parentCommentId: data.parent_comment_id || undefined,
      rootCommentId: data.root_comment_id || undefined,
      createdAt: new Date(data.created_at),
      reactions: {},
    };
  } catch (err) {
    console.warn("Error in createSupabaseReply:", err);
    return null;
  }
}

// Soft-delete a comment that has live replies underneath it (they'd
// otherwise be orphaned/removed by a hard DELETE): clears the body and
// sets deleted_at so the UI can render a neutral "This comment has been
// removed." placeholder while every reply underneath stays intact.
export async function softDeleteSupabaseComment(commentId: string): Promise<boolean> {
  if (!supabase) return false;
  const client = supabase;

  try {
    const { data, error } = await client
      .from("comments")
      .update({ deleted_at: new Date().toISOString(), body: "", updated_at: new Date().toISOString() })
      .eq("id", commentId)
      .select("id");

    if (error) {
      console.warn("Error soft-deleting comment:", error);
      return false;
    }

    return !!data && data.length > 0;
  } catch (err) {
    console.warn("Error in softDeleteSupabaseComment:", err);
    return false;
  }
}
