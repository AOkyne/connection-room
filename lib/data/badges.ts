// Badges data access layer - demo mode with localStorage

import { demoBadges } from "./demo-data";
import type { Badge } from "./demo-data";

const BADGES_STORAGE_KEY = "connection-room:badges";

// Get user's badges
export function getUserBadges(userId: string): Badge[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(`${BADGES_STORAGE_KEY}:${userId}`);
  if (stored) {
    return JSON.parse(stored);
  }

  // Return demo badges for new users
  return demoBadges;
}

// Award a badge to a user
export function awardBadge(userId: string, badgeId: string): void {
  if (typeof window === "undefined") return;

  const badges = getUserBadges(userId);
  const badgeTemplate = demoBadges.find((b) => b.id === badgeId);

  if (!badgeTemplate || badges.some((b) => b.id === badgeId)) {
    return; // Badge already awarded or doesn't exist
  }

  const newBadge: Badge = {
    ...badgeTemplate,
    earnedAt: new Date(),
  };

  badges.push(newBadge);
  localStorage.setItem(`${BADGES_STORAGE_KEY}:${userId}`, JSON.stringify(badges));
}

// Get all available badge templates
export function getAllBadges(): Badge[] {
  return demoBadges;
}
