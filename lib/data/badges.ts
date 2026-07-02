// Badges data access layer - both milestone-earned and activity-based

import type { Badge } from "./demo-data";
import { demoBadges } from "./demo-data";
import { getConnectionMilestones } from "./connection-practice";
import { getProfile } from "./profiles";
import { getSpaces } from "./spaces";
import { getPosts, getUserEngagementStats } from "./posts";
import { getRecentReflections } from "./reflections";

// Milestone-based badges (earned through connection practice)
const MILESTONE_BADGES: Record<string, Badge> = {
  "first-share": {
    id: "first-share",
    name: "First Share",
    description: "Made your first post",
    icon: "share",
    color: "text-rose-600",
  },
  "first-witness": {
    id: "first-witness",
    name: "First Witness",
    description: "Left your first thoughtful comment",
    icon: "witness",
    color: "text-blue-600",
  },
  "thoughtful-witness": {
    id: "thoughtful-witness",
    name: "Thoughtful Witness",
    description: "Left 5 thoughtful comments",
    icon: "thoughtful",
    color: "text-pink-600",
  },
  "community-builder": {
    id: "community-builder",
    name: "Community Builder",
    description: "Active participant with 3+ posts and comments",
    icon: "community",
    color: "text-green-600",
  },
};

// Check which activity-based badges have been earned
// Accepts data as parameters to avoid redundant fetches
async function checkActivityBasedBadges(
  userId: string,
  profile?: any,
  spaces?: any[],
  posts?: any[]
): Promise<Badge[]> {
  const earned: Badge[] = [];

  try {
    // Only fetch data if not provided (avoid redundant calls)
    if (!profile) {
      try {
        profile = await getProfile();
      } catch (err) {
        console.warn("Could not fetch profile for badges:", err);
      }
    }
    if (!spaces) {
      try {
        spaces = await getSpaces();
      } catch (err) {
        console.warn("Could not fetch spaces for badges:", err);
      }
    }
    if (!posts) {
      try {
        posts = await getPosts();
      } catch (err) {
        console.warn("Could not fetch posts for badges:", err);
      }
    }

    // Try to get engagement stats but don't fail if unavailable
    let engagementStats: any = null;
    try {
      engagementStats = await getUserEngagementStats(userId);
    } catch (err) {
      console.warn("Could not fetch engagement stats:", err);
    }

    // First Step: account exists (triggered on first visit)
    if (profile) {
      const firstStep = demoBadges.find((b) => b.id === "first-step");
      if (firstStep) earned.push(firstStep);
    }

    // Self-Aware: completed quiz/connection assessment
    if (profile?.quizResult && profile.quizResult !== "I have not taken the quiz yet") {
      const selfAware = demoBadges.find((b) => b.id === "self-aware");
      if (selfAware) earned.push(selfAware);
    }

    // Explorer: joined 3+ spaces
    if (spaces) {
      const joinedSpaces = spaces.filter((s) => s.isJoined).length;
      if (joinedSpaces >= 3) {
        const explorer = demoBadges.find((b) => b.id === "explorer");
        if (explorer) earned.push(explorer);
      }
    }

    // Truth Teller: shared authentically in 5+ posts
    if (posts) {
      const userPosts = posts.filter((p) => p.userId === userId);
      if (userPosts.length >= 5) {
        const truthTeller = demoBadges.find((b) => b.id === "truth-teller");
        if (truthTeller) earned.push(truthTeller);
      }
    }

    // Community Builder: active participant with 3+ posts and comments (combined)
    if (engagementStats) {
      try {
        const totalContributions = (engagementStats.postsShared || 0) + (engagementStats.commentsOffered || 0);
        if (totalContributions >= 3) {
          const communityBuilder = demoBadges.find((b) => b.id === "community-builder");
          if (communityBuilder) earned.push(communityBuilder);
        }
      } catch (err) {
        console.warn("Error checking community builder badge:", err);
      }
    }

    // Vulnerability Warrior: responded to 10+ prompts
    if (engagementStats) {
      try {
        if ((engagementStats.responsesReceived || 0) >= 10) {
          const vulnerabilityWarrior = demoBadges.find((b) => b.id === "vulnerability-warrior");
          if (vulnerabilityWarrior) earned.push(vulnerabilityWarrior);
        }
      } catch (err) {
        console.warn("Error checking vulnerability warrior badge:", err);
      }
    }

    // Connection Seeker: participated in a connection (has connection milestone)
    if (profile?.spacesJoined && profile.spacesJoined.length > 0) {
      const connectionSeeker = demoBadges.find((b) => b.id === "connection-seeker");
      if (connectionSeeker) earned.push(connectionSeeker);
    }

    // Embodied: active in Embodiment Practice space
    if (spaces && posts) {
      const embodimentSpace = spaces.find((s) => s.id === "embodiment" && s.isJoined);
      if (embodimentSpace) {
        const embodimentPosts = posts.filter((p) => p.userId === userId && p.spaceId === "embodiment");
        if (embodimentPosts.length > 0) {
          const embodied = demoBadges.find((b) => b.id === "embodied");
          if (embodied) earned.push(embodied);
        }
      }
    }

    // Consent Champion: acknowledged community agreements
    // This is tracked in profile.agreedToCommunityAgreements or similar
    if (profile?.agreedToCommunityAgreements || profile?.completedOnboarding) {
      const consentChampion = demoBadges.find((b) => b.id === "consent-champion");
      if (consentChampion) earned.push(consentChampion);
    }

    // Bridge Builder: engaged with both couples and single spaces
    if (spaces) {
      const coupleSpaces = spaces.filter((s) => s.isJoined && (s.id?.includes("couples") || s.forCouples));
      const singleSpaces = spaces.filter((s) => s.isJoined && !s.forCouples);
      if (coupleSpaces.length > 0 && singleSpaces.length > 0) {
        const bridgeBuilder = demoBadges.find((b) => b.id === "bridge-builder");
        if (bridgeBuilder) earned.push(bridgeBuilder);
      }
    }

    // First Response: made first post or prompt response
    if (posts) {
      const userPosts = posts.filter((p) => p.userId === userId);
      if (userPosts.length >= 1) {
        const firstResponse = demoBadges.find((b) => b.id === "first-response");
        if (firstResponse) earned.push(firstResponse);
      }
    }
  } catch (error) {
    console.error("Error checking activity-based badges:", error);
  }

  return earned;
}

// Get all earned badges (both milestone and activity-based)
// Optionally accepts profile, spaces, and posts to avoid redundant fetches
export async function getUserBadges(
  userId: string,
  profile?: any,
  spaces?: any[],
  posts?: any[]
): Promise<Badge[]> {
  if (typeof window === "undefined") return [];

  try {
    // Get activity-based badges (these don't require async calls if data is provided)
    const activityBadges = await checkActivityBasedBadges(userId, profile, spaces, posts);

    // Only fetch milestones if we have a userId
    let milestoneEarned: Badge[] = [];
    if (userId) {
      try {
        const milestones = await getConnectionMilestones(userId);
        milestoneEarned = milestones
          .map((m) => {
            const template = MILESTONE_BADGES[m.milestoneType];
            if (!template) return null;
            return {
              ...template,
              earnedAt: m.earnedAt,
            } as Badge;
          })
          .filter((b) => b !== null) as Badge[];
      } catch (err) {
        console.warn("Could not fetch milestones:", err);
        // Continue without milestones if fetch fails
      }
    }

    // Combine and deduplicate
    const allBadges = [...milestoneEarned, ...activityBadges];
    const uniqueIds = new Set<string>();
    const result = allBadges.filter((b) => {
      if (uniqueIds.has(b.id)) return false;
      uniqueIds.add(b.id);
      return true;
    });

    return result;
  } catch (error) {
    console.error("Error getting badges:", error);
    return [];
  }
}

// Get all available badge templates
export function getAllBadges(): Badge[] {
  return [...Object.values(MILESTONE_BADGES), ...demoBadges];
}
