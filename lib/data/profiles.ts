import { supabase } from "@/lib/supabase/client";
import { saveProfileToSupabase, getProfileFromSupabase } from "@/lib/data/supabase-profiles";

export interface Profile {
  id: string;
  displayName: string;
  pronouns?: string;
  location?: string;
  ageRange?: string;
  relationshipStatus?: string;
  orientation?: string;
  profilePhoto: string;
  memberType: string;
  whatBroughtYouHere?: string;
  connectionHoping?: string;
  interests: string[];
  pairingComfortLevel?: string;
  pairingBoundaries?: string;
  quizResult?: string;
  firstPromptResponse?: string;
  firstPromptIsPublic?: boolean;
  completedOnboarding: boolean;
  spacesJoined?: string[];
  joinedAt: Date;
  photo_confirmed?: boolean;
  photo_confirmed_at?: Date;
  profile_tagline?: string;
  show_in_member_lists?: boolean;
  profile_visibility?: 'space_members' | 'all_authenticated_members' | 'limited';
  show_general_location?: boolean;
  show_recent_posts?: boolean;
  is_demo_profile?: boolean;
}

export interface CoupleProfile {
  id: string;
  userId: string; // primary member
  coupleDisplayName?: string;
  partner2Name?: string;
  partner2Email?: string;
  partner2PhotoUrl?: string;
  relationshipLength?: string;
  relationshipStructure?: string;
  coupleGoals: string[];
  couplesBoundaries?: string;
  createdAt: Date;
}

// Demo storage key
const PROFILE_STORAGE_KEY = "connection-room:profile";
const COUPLE_PROFILE_STORAGE_KEY = "connection-room:couple-profile";

// Get current authenticated Supabase user ID (client-side only)
async function getCurrentSupabaseUserId(): Promise<string | null> {
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

// Get current profile from Supabase (if authenticated) or localStorage
export async function getProfile(): Promise<Profile | null> {
  if (typeof window === "undefined") return null;

  const userId = await getCurrentSupabaseUserId();
  if (userId && supabase) {
    const profile = await getProfileFromSupabase(userId);
    if (profile) return profile;
  }

  const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

// Save profile to Supabase (if authenticated) or localStorage
export async function saveProfile(profile: Profile): Promise<void> {
  if (typeof window === "undefined") return;

  const userId = await getCurrentSupabaseUserId();
  if (userId && supabase) {
    const profileWithUserId = {
      ...profile,
      id: userId,
    };
    await saveProfileToSupabase(profileWithUserId);
  } else {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }
}

// Create a new demo profile (localStorage only, for demo mode)
export function createDemoProfile(displayName: string, memberType: string): Profile {
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const profile: Profile = {
    id: `user-${Date.now()}`,
    displayName,
    memberType,
    interests: [],
    profilePhoto: generateAvatarUrl(initials),
    completedOnboarding: false,
    joinedAt: new Date(),
  };
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

// Initialize profile for newly authenticated Supabase user
export async function initializeSupabaseProfile(email: string): Promise<Profile | null> {
  const userId = await getCurrentSupabaseUserId();
  if (!userId || !supabase) return null;

  const displayName = email.split("@")[0];
  const initials = displayName
    .split(".")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const profile: Profile = {
    id: userId,
    displayName,
    memberType: "individual",
    interests: [],
    profilePhoto: generateAvatarUrl(initials),
    completedOnboarding: false,
    joinedAt: new Date(),
  };

  await saveProfile(profile);
  return profile;
}

// Generate a simple avatar URL (SVG data URL)
function generateAvatarUrl(initials: string): string {
  const colors = [
    "#d4a574",
    "#9d7f5c",
    "#8fa878",
    "#b86a52",
    "#6b5f52",
    "#a0968a",
  ];
  const color = colors[initials.charCodeAt(0) % colors.length];

  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${color}"/>
      <text x="100" y="120" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Update profile fields
export async function updateProfile(updates: Partial<Profile>): Promise<Profile | null> {
  const profile = await getProfile();
  if (!profile) return null;
  const updated = { ...profile, ...updates };
  await saveProfile(updated);
  return updated;
}

// Get or create couple profile
export function getCoupleProfile(): CoupleProfile | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(COUPLE_PROFILE_STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

// Save couple profile
export function saveCoupleProfile(coupleProfile: CoupleProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COUPLE_PROFILE_STORAGE_KEY, JSON.stringify(coupleProfile));
}

// Create couple profile
export function createCoupleProfile(userId: string): CoupleProfile {
  const coupleProfile: CoupleProfile = {
    id: `couple-${Date.now()}`,
    userId,
    coupleGoals: [],
    createdAt: new Date(),
  };
  saveCoupleProfile(coupleProfile);
  return coupleProfile;
}

// Update couple profile
export function updateCoupleProfile(updates: Partial<CoupleProfile>): CoupleProfile | null {
  const profile = getCoupleProfile();
  if (!profile) return null;
  const updated = { ...profile, ...updates };
  saveCoupleProfile(updated);
  return updated;
}

// Delete profile (logout)
export function deleteProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_STORAGE_KEY);
  localStorage.removeItem(COUPLE_PROFILE_STORAGE_KEY);
}
