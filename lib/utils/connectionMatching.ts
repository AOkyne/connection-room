import type { Profile } from "@/lib/data/profiles";

export interface MatchScore {
  profile: Profile;
  score: number;
  sharedInterests: string[];
  reason: string;
}

export function calculateConnectionMatch(userProfile: Profile, candidateProfile: Profile): MatchScore {
  let score = 0;
  const sharedInterests: string[] = [];
  const reasons: string[] = [];

  // Shared interests (highest weight)
  if (userProfile.interests && candidateProfile.interests) {
    const shared = userProfile.interests.filter(interest =>
      candidateProfile.interests.includes(interest)
    );
    sharedInterests.push(...shared);

    if (shared.length > 0) {
      score += Math.min(shared.length * 25, 50); // Max 50 points for shared interests
      reasons.push(`${shared.length} shared interest${shared.length > 1 ? 's' : ''}`);
    }
  }

  // Connection comfort level compatibility
  const comfortLevelMatch = (userProfile.connectionComfortLevel || "").toLowerCase().includes("mutual") &&
                            (candidateProfile.connectionComfortLevel || "").toLowerCase().includes("mutual");
  if (comfortLevelMatch) {
    score += 15;
    reasons.push("Compatible comfort levels");
  }

  // Boundaries alignment (both have expressed boundaries or both open)
  const userHasBoundaries = !!(userProfile.connectionBoundaries?.trim());
  const candidateHasBoundaries = !!(candidateProfile.connectionBoundaries?.trim());

  if (userHasBoundaries === candidateHasBoundaries) {
    score += 10;
    if (userHasBoundaries && candidateHasBoundaries) {
      reasons.push("Both have clear boundaries");
    } else {
      reasons.push("Both open to exploration");
    }
  }

  // Different but complementary interests (bonus for exploration)
  if (sharedInterests.length === 0 && userProfile.interests?.length && candidateProfile.interests?.length) {
    score += 8;
    reasons.push("Complementary interests for mutual growth");
  }

  // Recent member activity (prefer active members)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (new Date(candidateProfile.joinedAt) > weekAgo) {
    score += 5;
    reasons.push("Recently active member");
  }

  return {
    profile: candidateProfile,
    score: Math.min(score, 100),
    sharedInterests,
    reason: reasons.length > 0 ? reasons.join(" • ") : "Potential connection",
  };
}

export function findBestMatches(userProfile: Profile, allProfiles: Profile[], limit: number = 5): MatchScore[] {
  const matches = allProfiles
    .filter(profile => profile.id !== userProfile.id)
    .map(profile => calculateConnectionMatch(userProfile, profile))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return matches;
}
