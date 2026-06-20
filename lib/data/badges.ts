// Badges data access layer - both milestone-earned and activity-based

import type { Badge } from "./demo-data";
import { demoBadges } from "./demo-data";
import { getConnectionMilestones } from "./connection-practice";
import { getProfile } from "./profiles";
import { getSpaces } from "./spaces";
import { getPosts } from "./posts";

// New milestone-based badges
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
async function checkActivityBasedBadges(userId: string): Promise<Badge[]> {
  const earned: Badge[] = [];

  try {
    const profile = await getProfile();
    const spaces = await getSpaces();
    const posts = await getPosts();

    // Explorer: joined 3+ spaces
    if (spaces) {
      const joinedSpaces = spaces.filter((s) => s.isJoined).length;
      if (joinedSpaces >= 3) {
        const explorer = demoBadges.find((b) => b.id === "explorer");
        if (explorer) earned.push(explorer);
      }
    }

    // Truth Teller: 5+ posts
    if (posts) {
      const userPosts = posts.filter((p) => p.userId === userId);
      if (userPosts.length >= 5) {
        const truthTeller = demoBadges.find((b) => b.id === "truth-teller");
        if (truthTeller) earned.push(truthTeller);
      }
    }

    // Self-Aware: completed quiz
    if (profile && profile.quizResult && profile.quizResult !== "I have not taken the quiz yet") {
      const selfAware = demoBadges.find((b) => b.id === "self-aware");
      if (selfAware) earned.push(selfAware);
    }

    // First Step: account exists (triggered on first visit)
    if (profile) {
      const firstStep = demoBadges.find((b) => b.id === "first-step");
      if (firstStep) earned.push(firstStep);
    }
  } catch (error) {
    console.error("Error checking activity-based badges:", error);
  }

  return earned;
}

// Get all earned badges (both milestone and activity-based)
export async function getUserBadges(userId: string): Promise<Badge[]> {
  if (typeof window === "undefined") return [];

  try {
    // Get milestone-earned badges
    const milestones = await getConnectionMilestones(userId);
    const milestoneEarned = milestones
      .map((m) => {
        const template = MILESTONE_BADGES[m.milestoneType];
        if (!template) return null;
        return {
          ...template,
          earnedAt: m.earnedAt,
        };
      })
      .filter((b): b is Badge => b !== null);

    // Get activity-based badges
    const activityBadges = await checkActivityBasedBadges(userId);

    // Combine and deduplicate
    const allBadges = [...milestoneEarned, ...activityBadges];
    const uniqueIds = new Set<string>();
    return allBadges.filter((b) => {
      if (uniqueIds.has(b.id)) return false;
      uniqueIds.add(b.id);
      return true;
    });
  } catch (error) {
    console.error("Error getting badges:", error);
    return [];
  }
}

// Get all available badge templates
export function getAllBadges(): Badge[] {
  return [...Object.values(MILESTONE_BADGES), ...demoBadges];
}
