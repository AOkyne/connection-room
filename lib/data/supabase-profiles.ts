import { supabase } from "@/lib/supabase/client";
import type { Profile, CoupleProfile } from "./profiles";

// Create or update profile in Supabase
export async function saveProfileToSupabase(profile: Profile): Promise<Profile | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: profile.id,
        first_name: profile.firstName || "",
        last_name: profile.lastName || "",
        display_name: profile.displayName,
        pronouns: profile.pronouns,
        location: profile.location,
        age_range: profile.ageRange,
        relationship_status: profile.relationshipStatus,
        orientation: profile.orientation,
        profile_photo: profile.profilePhoto,
        member_type: profile.memberType,
        what_brought_you_here: profile.whatBroughtYouHere,
        connection_hoping: profile.connectionHoping,
        interests: profile.interests,
        connection_comfort_level: profile.connectionComfortLevel,
        connection_boundaries: profile.connectionBoundaries,
        quiz_result: profile.quizResult,
        first_prompt_response: profile.firstPromptResponse,
        first_prompt_is_public: profile.firstPromptIsPublic,
        completed_onboarding: profile.completedOnboarding,
        spaces_joined: profile.spacesJoined,
        joined_at: profile.joinedAt,
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error saving profile to Supabase:", error);
    return null;
  }

  return data
    ? {
        id: data.id,
        firstName: data.first_name || profile.firstName,
        lastName: data.last_name || profile.lastName,
        displayName: data.display_name,
        pronouns: data.pronouns,
        location: data.location,
        ageRange: data.age_range,
        relationshipStatus: data.relationship_status,
        orientation: data.orientation,
        profilePhoto: data.profile_photo,
        memberType: data.member_type,
        whatBroughtYouHere: data.what_brought_you_here,
        connectionHoping: data.connection_hoping,
        interests: data.interests || [],
        connectionComfortLevel: data.connection_comfort_level,
        connectionBoundaries: data.connection_boundaries,
        quizResult: data.quiz_result,
        firstPromptResponse: data.first_prompt_response,
        firstPromptIsPublic: data.first_prompt_is_public,
        completedOnboarding: data.completed_onboarding,
        spacesJoined: data.spaces_joined || [],
        joinedAt: new Date(data.joined_at),
      }
    : null;
}

// Get profile from Supabase
export async function getProfileFromSupabase(
  userId: string
): Promise<Profile | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  // Fetch joined spaces from space_memberships table
  let spacesJoined: string[] = [];
  const { data: memberships, error: membershipsError } = await supabase
    .from("space_memberships")
    .select("space_id")
    .eq("user_id", userId);

  if (!membershipsError && memberships && Array.isArray(memberships)) {
    spacesJoined = memberships.map((m: any) => m.space_id);
  }

  // Extract firstName and lastName from database or displayName fallback
  let firstName = data.first_name || "";
  let lastName = data.last_name || "";

  if (!firstName && !lastName && data.display_name) {
    const nameParts = data.display_name.trim().split(/\s+/);
    firstName = nameParts[0] || "";
    lastName = nameParts.slice(1).join(" ") || "";
  }

  return {
    id: data.id,
    firstName,
    lastName,
    displayName: data.display_name,
    pronouns: data.pronouns,
    location: data.location,
    ageRange: data.age_range,
    relationshipStatus: data.relationship_status,
    orientation: data.orientation,
    profilePhoto: data.profile_photo,
    memberType: data.member_type,
    whatBroughtYouHere: data.what_brought_you_here,
    connectionHoping: data.connection_hoping,
    interests: data.interests || [],
    connectionComfortLevel: data.connection_comfort_level,
    connectionBoundaries: data.connection_boundaries,
    quizResult: data.quiz_result,
    firstPromptResponse: data.first_prompt_response,
    firstPromptIsPublic: data.first_prompt_is_public,
    completedOnboarding: data.completed_onboarding,
    spacesJoined: spacesJoined,
    joinedAt: new Date(data.joined_at),
  };
}
