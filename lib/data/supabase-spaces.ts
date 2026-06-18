import { supabase } from "@/lib/supabase/client";

export interface Space {
  id: string;
  name: string;
  slug: string;
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
      console.error("Error fetching spaces:", error);
      return [];
    }

    return (
      data?.map((space) => ({
        id: space.id,
        name: space.name,
        slug: space.slug,
        description: space.description,
        icon: space.icon,
        visibility: space.visibility,
      })) || []
    );
  } catch (err) {
    console.error("Error in getSupabaseSpaces:", err);
    return [];
  }
}

// Get user's joined spaces from Supabase
export async function getUserJoinedSpaces(userId: string): Promise<Space[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("space_memberships")
      .select("space_id, spaces(*)")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user spaces:", error);
      return [];
    }

    return (
      data?.map((membership: any) => ({
        id: membership.spaces.id,
        name: membership.spaces.name,
        slug: membership.spaces.slug,
        description: membership.spaces.description,
        icon: membership.spaces.icon,
        visibility: membership.spaces.visibility,
      })) || []
    );
  } catch (err) {
    console.error("Error in getUserJoinedSpaces:", err);
    return [];
  }
}

// Join a space
export async function joinSpace(userId: string, spaceId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from("space_memberships").insert({
      user_id: userId,
      space_id: spaceId,
    });

    if (error) {
      console.error("Error joining space:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error in joinSpace:", err);
    return false;
  }
}

// Leave a space
export async function leaveSpace(userId: string, spaceId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("space_memberships")
      .delete()
      .eq("user_id", userId)
      .eq("space_id", spaceId);

    if (error) {
      console.error("Error leaving space:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error in leaveSpace:", err);
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
