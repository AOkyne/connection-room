// Badges data access layer - linked to connection milestones

import type { Badge } from "./demo-data";
import { getConnectionMilestones } from "./connection-practice";

// Badge template definitions (milestone type → badge info)
const BADGE_TEMPLATES: Record<string, Badge> = {
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

// Get user's earned badges from milestones
export async function getUserBadges(userId: string): Promise<Badge[]> {
  if (typeof window === "undefined") return [];

  try {
    const milestones = await getConnectionMilestones(userId);

    return milestones
      .map((m) => {
        const template = BADGE_TEMPLATES[m.milestoneType];
        if (!template) return null;

        return {
          ...template,
          earnedAt: m.earnedAt,
        };
      })
      .filter((b): b is Badge => b !== null);
  } catch (error) {
    console.error("Error getting badges:", error);
    return [];
  }
}

// Get all available badge templates
export function getAllBadges(): Badge[] {
  return Object.values(BADGE_TEMPLATES);
}

// Clear old localStorage badge data (migration from demo system)
export function clearOldBadgeData(): void {
  if (typeof window === "undefined") return;

  // Remove old badge storage keys
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("connection-room:badges")) {
      localStorage.removeItem(key);
    }
  });
}
