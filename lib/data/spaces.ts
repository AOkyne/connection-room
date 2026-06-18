// Spaces data access layer - demo mode only for Phase 1

import { demoSpaces } from "./demo-data";

export interface Space {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  memberCount: number;
  isJoined: boolean;
  featuredPrompt?: string;
}

const SPACES_STORAGE_KEY = "connection-room:spaces";

// Get all spaces with join status
export function getSpaces(): Space[] {
  if (typeof window === "undefined") {
    return demoSpaces;
  }

  const stored = localStorage.getItem(SPACES_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }

  // First time: save and return demo spaces
  localStorage.setItem(SPACES_STORAGE_KEY, JSON.stringify(demoSpaces));
  return demoSpaces;
}

// Get single space
export function getSpace(id: string): Space | null {
  const spaces = getSpaces();
  return spaces.find((s) => s.id === id) || null;
}

// Get joined spaces
export function getJoinedSpaces(): Space[] {
  return getSpaces().filter((s) => s.isJoined);
}

// Join a space
export function joinSpace(spaceId: string): Space | null {
  if (typeof window === "undefined") return null;

  const spaces = getSpaces();
  const space = spaces.find((s) => s.id === spaceId);
  if (!space) return null;

  space.isJoined = true;
  space.memberCount += 1;
  localStorage.setItem(SPACES_STORAGE_KEY, JSON.stringify(spaces));
  return space;
}

// Leave a space
export function leaveSpace(spaceId: string): Space | null {
  if (typeof window === "undefined") return null;

  const spaces = getSpaces();
  const space = spaces.find((s) => s.id === spaceId);
  if (!space) return null;

  space.isJoined = false;
  space.memberCount = Math.max(0, space.memberCount - 1);
  localStorage.setItem(SPACES_STORAGE_KEY, JSON.stringify(spaces));
  return space;
}

// Suggested space for new members
export function getSuggestedSpace(): Space | null {
  const spaces = getSpaces();
  const notJoined = spaces.filter((s) => !s.isJoined);
  if (notJoined.length === 0) return null;
  return notJoined[Math.floor(Math.random() * notJoined.length)];
}
