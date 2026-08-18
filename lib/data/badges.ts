// Badges data access layer - both milestone-earned and activity-based

import type { Badge } from "./demo-data";
import { demoBadges } from "./demo-data";
import { getConnectionMilestones } from "./connection-practice";
import { getProfile } from "./profiles";
import { getSpaces } from "./spaces";
import { getPosts, getUserEngagementStats } from "./posts";
import { getRecentReflections } from "./reflections";
import { getInvitedFriendsCount } from "./invites";
import { supabase } from "@/lib/supabase/client";

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
    // Every fetch below is independent of every other -- previously these
    // ran one after another (profile, then spaces, then posts, then
    // engagement stats, then invited-friends count), so total latency was
    // the SUM of every round trip rather than the slowest single one.
    // Combined with the 3-second timeout the profile page races this
    // against, that was enough on a real (non-local) database to blow
    // past the timeout and silently show "no badges earned" -- nothing
    // actually wrong with the account, just too slow to finish in time.
    // Fetching in parallel keeps each call's own error handling (a
    // failed fetch still degrades to "skip that badge check", never
    // throws) while cutting total wait time to roughly the slowest one.
    const [profileResult, spacesResult, postsResult, engagementStats, invitedCount] = await Promise.all([
      profile
        ? Promise.resolve(profile)
        : getProfile().catch((err) => {
            console.warn("Could not fetch profile for badges:", err);
            return undefined;
          }),
      spaces
        ? Promise.resolve(spaces)
        : getSpaces().catch((err) => {
            console.warn("Could not fetch spaces for badges:", err);
            return undefined;
          }),
      posts
        ? Promise.resolve(posts)
        : getPosts().catch((err) => {
            console.warn("Could not fetch posts for badges:", err);
            return undefined;
          }),
      getUserEngagementStats(userId).catch((err) => {
        console.warn("Could not fetch engagement stats:", err);
        return null;
      }),
      supabase
        ? getInvitedFriendsCount().catch((err) => {
            console.warn("Error checking invite-based community builder badge:", err);
            return 0;
          })
        : Promise.resolve(0),
    ]);
    profile = profileResult;
    spaces = spacesResult;
    posts = postsResult;

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

    // Community Builder (Invite-based): invited someone who joined
    if (invitedCount >= 1) {
      // Only add if not already added from engagement stats
      const alreadyHasBadge = earned.some((b) => b.id === "community-builder");
      if (!alreadyHasBadge) {
        const communityBuilder = demoBadges.find((b) => b.id === "community-builder");
        if (communityBuilder) earned.push(communityBuilder);
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
    // Activity-based badges and milestone badges come from entirely
    // independent sources (client-side derivation vs. a Supabase table) --
    // fetched in parallel rather than one after another, same reasoning
    // as checkActivityBasedBadges' own internal fetches above.
    const [activityBadges, milestoneEarned] = await Promise.all([
      checkActivityBasedBadges(userId, profile, spaces, posts),
      userId
        ? getConnectionMilestones(userId)
            .then((milestones) =>
              milestones
                .map((m) => {
                  const template = MILESTONE_BADGES[m.milestoneType];
                  if (!template) return null;
                  return { ...template, earnedAt: m.earnedAt } as Badge;
                })
                .filter((b) => b !== null) as Badge[]
            )
            .catch((err) => {
              console.warn("Could not fetch milestones:", err);
              return [] as Badge[];
            })
        : Promise.resolve([] as Badge[]),
    ]);

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
