import { supabase } from "@/lib/supabase/client";
import { demoSpaces } from "./demo-data";
import {
  getSupabaseSpaces,
  getUserJoinedSpaces,
  joinSpace as joinSupabaseSpace,
  leaveSpace as leaveSupabaseSpace,
  hasJoinedSpace as checkHasJoinedSpace,
} from "./supabase-spaces";

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
const SPACE_ORDER_KEY = "connection-room:space-order";
const REQUIRED_SPACES = ["start-here", "commons"];

// Get current authenticated user ID
async function getCurrentUserId(): Promise<string | null> {
  if (typeof window === "undefined" || !supabase) return null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (err) {
    return null;
  }
}

// Get all spaces with join status from Supabase or demo
export async function getSpaces(): Promise<Space[]> {
  if (typeof window === "undefined") {
    return demoSpaces;
  }

  const userId = await getCurrentUserId();
  if (userId && supabase) {
    try {
      console.log("Getting Supabase spaces for user:", userId);
      const supabaseSpaces = await getSupabaseSpaces();
      console.log("Supabase spaces:", supabaseSpaces.length);

      const joinedSpaces = await getUserJoinedSpaces(userId);
      console.log("User joined spaces:", joinedSpaces.length);
      const joinedIds = new Set(joinedSpaces.map((s) => s.id));

      const result = supabaseSpaces.map((space) => ({
        id: space.id,
        name: space.name,
        description: space.description || "",
        icon: space.icon || "",
        color: "#d4a574",
        memberCount: 0,
        isJoined: joinedIds.has(space.id),
      }));

      console.log("Returning spaces:", result.length);
      return result;
    } catch (err) {
      console.error("Error getting Supabase spaces:", err);
    }
  }

  console.log("Falling back to demo spaces (no userId or supabase)");

  // Fallback to demo/localStorage
  const stored = localStorage.getItem(SPACES_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }

  localStorage.setItem(SPACES_STORAGE_KEY, JSON.stringify(demoSpaces));
  return demoSpaces;
}

// Get single space
export async function getSpace(id: string): Promise<Space | null> {
  const spaces = await getSpaces();
  return spaces.find((s) => s.id === id) || null;
}

// Get joined spaces
export async function getJoinedSpaces(): Promise<Space[]> {
  const spaces = await getSpaces();
  return spaces.filter((s) => s.isJoined);
}

// Join a space
export async function joinSpace(spaceId: string): Promise<Space | null> {
  if (typeof window === "undefined") return null;

  const userId = await getCurrentUserId();
  if (userId && supabase) {
    const success = await joinSupabaseSpace(userId, spaceId);
    if (success) {
      const space = await getSpace(spaceId);
      return space;
    }
    return null;
  }

  // Demo mode fallback
  const spaces = await getSpaces();
  const space = spaces.find((s) => s.id === spaceId);
  if (!space) return null;

  space.isJoined = true;
  space.memberCount += 1;
  localStorage.setItem(SPACES_STORAGE_KEY, JSON.stringify(spaces));
  return space;
}

// Leave a space
export async function leaveSpace(spaceId: string): Promise<Space | null> {
  if (typeof window === "undefined") return null;

  const userId = await getCurrentUserId();
  if (userId && supabase) {
    const success = await leaveSupabaseSpace(userId, spaceId);
    if (success) {
      const space = await getSpace(spaceId);
      return space;
    }
    return null;
  }

  // Demo mode fallback
  const spaces = await getSpaces();
  const space = spaces.find((s) => s.id === spaceId);
  if (!space) return null;

  space.isJoined = false;
  space.memberCount = Math.max(0, space.memberCount - 1);
  localStorage.setItem(SPACES_STORAGE_KEY, JSON.stringify(spaces));
  return space;
}

// Suggested space for new members
export async function getSuggestedSpace(): Promise<Space | null> {
  const spaces = await getSpaces();
  const notJoined = spaces.filter((s) => !s.isJoined);
  if (notJoined.length === 0) return null;
  return notJoined[Math.floor(Math.random() * notJoined.length)];
}

// Ensure required spaces are joined (Start Here and The Commons)
export async function ensureRequiredSpaces(): Promise<void> {
  if (typeof window === "undefined") return;

  const userId = await getCurrentUserId();
  if (!userId) return;

  for (const spaceId of REQUIRED_SPACES) {
    const hasJoined = await checkHasJoinedSpace(userId, spaceId);
    if (!hasJoined) {
      await joinSupabaseSpace(userId, spaceId);
    }
  }
}

// Save space order preference
export function saveSpaceOrder(spaceIds: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SPACE_ORDER_KEY, JSON.stringify(spaceIds));
}

// Get saved space order preference
export function getSpaceOrder(): string[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(SPACE_ORDER_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Sort spaces by saved order, with required spaces first
export function sortSpacesByPreference(spaces: Space[]): Space[] {
  const saved = getSpaceOrder();

  // Separate spaces into required and optional
  const required = spaces.filter(s => REQUIRED_SPACES.includes(s.id));
  const optional = spaces.filter(s => !REQUIRED_SPACES.includes(s.id));

  // Sort required spaces: Start Here first, then The Commons
  required.sort((a, b) => {
    if (a.id === "start-here") return -1;
    if (b.id === "start-here") return 1;
    return 0;
  });

  // Sort optional spaces by saved order if available
  if (saved.length > 0) {
    optional.sort((a, b) => {
      const aIndex = saved.indexOf(a.id);
      const bIndex = saved.indexOf(b.id);
      const aPos = aIndex === -1 ? Infinity : aIndex;
      const bPos = bIndex === -1 ? Infinity : bIndex;
      return aPos - bPos;
    });
  }

  return [...required, ...optional];
}
