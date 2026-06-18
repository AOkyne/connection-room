// Profile data access layer - demo mode only for Phase 1
// In Phase 2, this will switch between local/demo and Supabase

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
}

export interface CoupleProfile {
  id: string;
  userId: string; // primary member
  coupleDisplayName?: string;
  partner2Name?: string;
  partner2Email?: string;
  relationshipLength?: string;
  relationshipStructure?: string;
  coupleGoals: string[];
  couplesBoundaries?: string;
  createdAt: Date;
}

// Demo storage key
const PROFILE_STORAGE_KEY = "connection-room:profile";
const COUPLE_PROFILE_STORAGE_KEY = "connection-room:couple-profile";

// Get current profile from localStorage
export function getProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

// Save profile to localStorage
export function saveProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

// Create a new demo profile
export function createDemoProfile(displayName: string, memberType: string): Profile {
  // Generate a default avatar based on initials
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
  saveProfile(profile);
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
export function updateProfile(updates: Partial<Profile>): Profile | null {
  const profile = getProfile();
  if (!profile) return null;
  const updated = { ...profile, ...updates };
  saveProfile(updated);
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
