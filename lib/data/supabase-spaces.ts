import { supabase } from "@/lib/supabase/client";

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

  try {
    const { error } = await supabase.from("space_memberships").insert({
      user_id: userId,
      space_id: spaceId,
    });

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

  try {
    const { error } = await supabase
      .from("space_memberships")
      .delete()
      .eq("user_id", userId)
      .eq("space_id", spaceId);

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
