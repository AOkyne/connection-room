import { supabase } from "@/lib/supabase/client";
import { demoSafeWrite } from "@/lib/demo/demo-mode-guard";

export interface Space {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  visibility: string;
}

// Get all spaces from Supabase
export async function getSupabaseSpaces(): Promise<Space[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("spaces")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.warn("Could not fetch spaces from Supabase, using fallback:", error?.message);
      return [];
    }

    return (
      data?.map((space) => ({
        id: space.id,
        name: space.name,
        description: space.description,
        icon: space.icon,
        visibility: space.visibility,
      })) || []
    );
  } catch (err) {
    console.warn("Exception in getSupabaseSpaces, using fallback");
    return [];
  }
}

// Get user's joined spaces from Supabase
export async function getUserJoinedSpaces(userId: string): Promise<Space[]> {
  if (!supabase) return [];

  try {
    console.log("Fetching space memberships for user:", userId);

    // Get space IDs that user has joined
    const { data: memberships, error: membershipError } = await supabase
      .from("space_memberships")
      .select("space_id")
      .eq("user_id", userId);

    if (membershipError) {
      console.warn("Could not fetch space memberships, using fallback:", membershipError?.message);
      return [];
    }

    console.log("Space memberships found:", memberships?.length || 0);

    if (!memberships || memberships.length === 0) {
      return [];
    }

    const spaceIds = memberships.map((m: any) => m.space_id);

    // Fetch space details for those IDs
    const { data: spaces, error: spacesError } = await supabase
      .from("spaces")
      .select("*")
      .in("id", spaceIds);

    if (spacesError) {
      console.warn("Could not fetch space details, using fallback:", spacesError?.message);
      return [];
    }

    return (
      spaces?.map((space) => ({
        id: space.id,
        name: space.name,
        description: space.description,
        icon: space.icon,
        visibility: space.visibility,
      })) || []
    );
  } catch (err) {
    console.warn("Exception in getUserJoinedSpaces, using fallback");
    return [];
  }
}

// Join a space
export async function joinSpace(userId: string, spaceId: string): Promise<boolean> {
  if (!supabase) return false;
  const client = supabase;

  try {
    const { error } = await demoSafeWrite(
      () => client.from("space_memberships").insert({
        user_id: userId,
        space_id: spaceId,
      }),
      { context: "joinSpace" }
    );

    if (error) {
      console.warn("Error joining space:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("Error in joinSpace:", err);
    return false;
  }
}

// Leave a space
export async function leaveSpace(userId: string, spaceId: string): Promise<boolean> {
  if (!supabase) return false;
  const client = supabase;

  try {
    const { error } = await demoSafeWrite(
      () => client
        .from("space_memberships")
        .delete()
        .eq("user_id", userId)
        .eq("space_id", spaceId),
      { context: "leaveSpace" }
    );

    if (error) {
      console.warn("Error leaving space:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("Error in leaveSpace:", err);
    return false;
  }
}

// Check if user has joined a space
export async function hasJoinedSpace(userId: string, spaceId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from("space_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("space_id", spaceId)
      .single();

    if (error) return false;
    return !!data;
  } catch (err) {
    return false;
  }
}

// Get count of new posts/comments in a space since user's last visit
export async function getNewContentCount(userId: string, spaceId: string): Promise<number> {
  if (!supabase) return 0;

  try {
    // Get user's last visit time for this space
    const { data: membership, error: membershipError } = await supabase
      .from("space_memberships")
      .select("last_visited_at")
      .eq("user_id", userId)
      .eq("space_id", spaceId)
      .single();

    if (membershipError || !membership) {
      console.warn("Could not get space membership:", membershipError?.message);
      return 0;
    }

    const lastVisited = membership.last_visited_at ? new Date(membership.last_visited_at) : null;
    if (!lastVisited) return 0;

    // Count posts created after last visit
    let query = supabase
      .from("posts")
      .select("id", { count: "exact" })
      .eq("space_id", spaceId)
      .gt("created_at", lastVisited.toISOString());

    const { count: postCount, error: postError } = await query;

    if (postError) {
      console.warn("Could not count posts:", postError.message);
      return 0;
    }

    return postCount || 0;
  } catch (err) {
    console.warn("Error in getNewContentCount:", err);
    return 0;
  }
}

// Update last_visited_at for a user in a space
export async function updateSpaceVisit(userId: string, spaceId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("space_memberships")
      .update({ last_visited_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("space_id", spaceId);

    if (error) {
      console.warn("Error updating space visit:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("Error in updateSpaceVisit:", err);
    return false;
  }
}

// Get all new posts and comments across all spaces for admin
export async function getAllNewContent(sinceMinutesAgo: number = 1440): Promise<any[]> {
  if (!supabase) return [];

  try {
    const sinceTime = new Date(Date.now() - sinceMinutesAgo * 60 * 1000).toISOString();

    // Get new posts
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, space_id, user_id, author_name, body, created_at")
      .gt("created_at", sinceTime)
      .order("created_at", { ascending: false });

    if (postsError) {
      console.warn("Could not fetch new posts:", postsError.message);
      return [];
    }

    // Get new comments
    const { data: comments, error: commentsError } = await supabase
      .from("comments")
      .select("id, post_id, user_id, author_name, body, created_at, posts(space_id)")
      .gt("created_at", sinceTime)
      .order("created_at", { ascending: false });

    if (commentsError) {
      console.warn("Could not fetch new comments:", commentsError.message);
    }

    // Combine and sort
    const allContent = [
      ...(posts?.map(p => ({ ...p, type: "post" })) || []),
      ...(comments?.map(c => ({ ...c, type: "comment" })) || []),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return allContent;
  } catch (err) {
    console.warn("Error in getAllNewContent:", err);
    return [];
  }
}
