import type { Profile } from "./data/profiles";
import { supabase } from "@/lib/supabase/client";

interface MatchScore {
  profile: Profile;
  score: number;
  sharedInterests: string[];
}

export async function findMatches(
  userProfile: Profile,
  limit: number = 5
): Promise<MatchScore[]> {
  if (!supabase) return [];

  try {
    // Get all profiles except the current user
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", userProfile.id);

    if (error || !profiles) {
      console.error("Error fetching profiles:", error);
      return [];
    }

    // Filter and score profiles
    const candidates = (profiles as any[])
      .filter((p) => {
        // Must have completed onboarding, have a photo, and have interests
        return (
          p.completed_onboarding &&
          p.profile_photo &&
          p.interests &&
          Array.isArray(p.interests) &&
          p.interests.length > 0
        );
      })
      .map((p) => {
        const sharedInterests = calculateSharedInterests(
          userProfile.interests || [],
          p.interests || []
        );

        const score = calculateMatchScore(userProfile, p, sharedInterests);
        return {
          profile: formatProfile(p),
          score,
          sharedInterests,
        };
      })
      .filter((m) => m.score > 0) // Only include profiles with some match
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return candidates;
  } catch (err) {
    console.error("Error finding matches:", err);
    return [];
  }
}

function calculateSharedInterests(
  userInterests: string[],
  profileInterests: string[]
): string[] {
  return userInterests.filter((interest) =>
    profileInterests.some(
      (pi) => pi.toLowerCase() === interest.toLowerCase()
    )
  );
}

function calculateMatchScore(
  userProfile: Profile,
  candidateProfile: any,
  sharedInterests: string[]
): number {
  let score = 0;

  // Shared interests (heaviest weight)
  score += sharedInterests.length * 30;

  // Location match (if both have location)
  if (
    userProfile.location &&
    candidateProfile.location &&
    userProfile.location.toLowerCase() ===
      candidateProfile.location.toLowerCase()
  ) {
    score += 20;
  }

  // Relationship status compatibility (couples can connect with couples or individuals)
  if (
    userProfile.relationshipStatus &&
    candidateProfile.relationship_status
  ) {
    const compatible =
      (userProfile.relationshipStatus === "Married" &&
        candidateProfile.relationship_status === "Married") ||
      (userProfile.relationshipStatus === "Single" &&
        candidateProfile.relationship_status === "Single") ||
      userProfile.relationshipStatus === "Divorced" ||
      candidateProfile.relationship_status === "Divorced"; // Divorced can match with anyone

    if (compatible) {
      score += 10;
    }
  }

  // Age range proximity (optional, only if both have age range)
  if (userProfile.ageRange && candidateProfile.age_range) {
    const ageProximity = Math.abs(
      extractMidpoint(userProfile.ageRange) -
        extractMidpoint(candidateProfile.age_range)
    );
    if (ageProximity <= 10) {
      score += 10;
    }
  }

  return score;
}

function extractMidpoint(ageRange: string): number {
  const match = ageRange.match(/(\d+)-(\d+)/);
  if (match) {
    const min = parseInt(match[1]);
    const max = parseInt(match[2]);
    return (min + max) / 2;
  }
  return 0;
}

function formatProfile(dbProfile: any): Profile {
  return {
    id: dbProfile.id,
    firstName: dbProfile.first_name || "",
    lastName: dbProfile.last_name || "",
    displayName: dbProfile.display_name || "",
    pronouns: dbProfile.pronouns,
    location: dbProfile.location,
    ageRange: dbProfile.age_range,
    relationshipStatus: dbProfile.relationship_status,
    orientation: dbProfile.orientation,
    profilePhoto: dbProfile.profile_photo || "",
    memberType: dbProfile.member_type || "individual",
    whatBroughtYouHere: dbProfile.what_brought_you_here,
    connectionHoping: dbProfile.connection_hoping,
    interests: dbProfile.interests || [],
    connectionComfortLevel: dbProfile.connection_comfort_level,
    connectionBoundaries: dbProfile.connection_boundaries,
    quizResult: dbProfile.quiz_result,
    firstPromptResponse: dbProfile.first_prompt_response,
    firstPromptIsPublic: dbProfile.first_prompt_is_public,
    completedOnboarding: dbProfile.completed_onboarding,
    spacesJoined: dbProfile.spaces_joined,
    joinedAt: new Date(dbProfile.joined_at),
    photo_confirmed: dbProfile.photo_confirmed,
    profile_tagline: dbProfile.profile_tagline,
    show_in_member_lists: dbProfile.show_in_member_lists,
    profile_visibility: dbProfile.profile_visibility,
    is_demo_profile: dbProfile.is_demo_profile,
  };
}
