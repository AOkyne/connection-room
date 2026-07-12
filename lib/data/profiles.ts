import { supabase } from "@/lib/supabase/client";
import { saveProfileToSupabase, getProfileFromSupabase } from "@/lib/data/supabase-profiles";

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
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
  connectionComfortLevel?: string;
  connectionBoundaries?: string;
  quizResult?: string;
  firstPromptResponse?: string;
  firstPromptIsPublic?: boolean;
  completedOnboarding: boolean;
  spacesJoined?: string[];
  joinedAt: Date;
  lastActive?: Date;
  photo_confirmed?: boolean;
  photo_confirmed_at?: Date;
  profile_tagline?: string;
  show_in_member_lists?: boolean;
  profile_visibility?: 'space_members' | 'all_authenticated_members' | 'limited';
  show_general_location?: boolean;
  show_recent_posts?: boolean;
  is_demo_profile?: boolean;
  inviteCode?: string;
  invitedByProfileId?: string;
  welcomeVideoWatched?: boolean;
  welcomeVideoWatchedAt?: Date;
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

  // Try to get from Supabase first (for authenticated users) with 5-second timeout
  let userId: string | null = null;
  try {
    const userIdPromise = getCurrentSupabaseUserId();
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 2000)
    );
    userId = await Promise.race([userIdPromise, timeoutPromise]);
  } catch (err) {
    console.warn("Error getting user ID:", err);
  }

  if (userId && supabase) {
    try {
      const queryPromise = supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile query timeout")), 3000)
      );

      const result = await Promise.race([queryPromise, timeoutPromise]);
      const { data, error } = result as any;

      if (!error && data) {
        // Map Supabase profile to Profile interface
        return {
          id: data.user_id || data.id,
          firstName: data.display_name?.split(" ")[0] || "",
          lastName: data.display_name?.split(" ").slice(1).join(" ") || "",
          displayName: data.display_name || "",
          pronouns: data.pronouns,
          location: data.location,
          ageRange: data.age_range,
          relationshipStatus: data.relationship_status,
          orientation: data.orientation,
          profilePhoto: data.profile_photo || "",
          memberType: data.member_type || "individual",
          whatBroughtYouHere: data.what_brought_you_here,
          connectionHoping: data.connection_hoping,
          interests: Array.isArray(data.interests) ? data.interests : [],
          connectionComfortLevel: data.pairing_comfort_level,
          connectionBoundaries: data.pairing_boundaries,
          quizResult: data.quiz_result,
          firstPromptResponse: data.first_prompt_response,
          firstPromptIsPublic: data.first_prompt_is_public,
          completedOnboarding: data.completed_onboarding || false,
          spacesJoined: Array.isArray(data.spaces_joined) ? data.spaces_joined : [],
          joinedAt: new Date(data.created_at),
          welcomeVideoWatched: data.welcome_video_watched || false,
          welcomeVideoWatchedAt: data.welcome_video_watched_at ? new Date(data.welcome_video_watched_at) : undefined,
        };
      }
    } catch (err) {
      console.warn("Error fetching profile from Supabase:", err);
    }
  }

  // Fall back to localStorage for demo mode
  const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }

  // Final fallback: return a minimal demo profile so pages don't hang
  return {
    id: "demo-user-" + Date.now(),
    firstName: "Guest",
    lastName: "",
    displayName: "Guest User",
    memberType: "individual",
    interests: [],
    profilePhoto: "",
    completedOnboarding: true,
    joinedAt: new Date(),
  };
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

  const nameParts = displayName.trim().split(/\s+/);
  const firstName = nameParts[0] || "Member";
  const lastName = nameParts.slice(1).join(" ") || "";

  const profile: Profile = {
    id: `user-${Date.now()}`,
    firstName,
    lastName,
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

  const nameParts = displayName.replace(/\./g, " ").trim().split(/\s+/);
  const firstName = nameParts[0] || "Member";
  const lastName = nameParts.slice(1).join(" ") || "";

  const profile: Profile = {
    id: userId,
    firstName,
    lastName,
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
    "#d4a348",
    "#8b6f47",
    "#c97a2a",
    "#a84a2a",
    "#1a0f0a",
    "#a0704a",
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

// Get all profiles for matching (demo profiles for now)
export function getDemoProfiles(): Profile[] {
  const demoProfiles: Profile[] = [
    {
      id: "demo-alex",
      firstName: "Alex",
      lastName: "Chen",
      displayName: "Alex",
      pronouns: "he/him",
      location: "San Francisco, CA",
      ageRange: "35-42",
      relationshipStatus: "Divorced",
      orientation: "Curious",
      profilePhoto: "/demo-members/seed-man-04.png",
      memberType: "individual",
      interests: ["Embodiment", "Authentic connection", "Touch and affection"],
      whatBroughtYouHere: "Looking to deepen my emotional capacity and explore authentic vulnerability with others on a similar path",
      connectionHoping: "Meaningful conversations that challenge me to grow and connect on a deeper level",
      connectionComfortLevel: "Mutual vulnerability and exploration. I value presence over performance.",
      connectionBoundaries: "Respect consent always. Clear communication about intentions and boundaries.",
      profile_tagline: "Exploring depth through authentic presence",
      completedOnboarding: true,
      joinedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      is_demo_profile: true,
    },
    {
      id: "demo-jordan",
      firstName: "Jordan",
      lastName: "Williams",
      displayName: "Jordan",
      pronouns: "they/them",
      location: "Oakland, CA",
      ageRange: "28-35",
      relationshipStatus: "Single",
      orientation: "Bisexual",
      profilePhoto: "/demo-members/seed-man-08.png",
      memberType: "individual",
      interests: ["Spirituality", "Sexuality", "Relationships", "Community"],
      whatBroughtYouHere: "Seeking a space where I can explore sexuality and spirituality without judgment",
      connectionHoping: "Deep, non-linear conversations with people exploring similar questions about identity and connection",
      connectionComfortLevel: "Open and honest communication. I appreciate curiosity and non-judgment.",
      connectionBoundaries: "No judgment, full safety. We set boundaries together.",
      profile_tagline: "Curious about everything, judgmental about nothing",
      completedOnboarding: true,
      joinedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      is_demo_profile: true,
    },
    {
      id: "demo-marcus",
      firstName: "Marcus",
      lastName: "Johnson",
      displayName: "Marcus",
      pronouns: "he/him",
      location: "Berkeley, CA",
      ageRange: "42-50",
      relationshipStatus: "Married",
      orientation: "Bisexual",
      profilePhoto: "/demo-members/seed-man-12.png",
      memberType: "individual",
      interests: ["Communication and repair", "Couples intimacy", "Shame and self-acceptance", "Embodiment"],
      whatBroughtYouHere: "My wife and I want to expand our capacity for authentic connection and explore vulnerability together",
      connectionHoping: "Both individual and couple conversations that strengthen our foundation and help us grow together",
      connectionComfortLevel: "Deep emotional connection with grounded presence. I value integrity.",
      connectionBoundaries: "Boundaries are essential. Clear agreements about what's okay.",
      profile_tagline: "Building bridges between mind, body, and heart",
      completedOnboarding: true,
      joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      is_demo_profile: true,
    },
    {
      id: "demo-sam",
      firstName: "Sam",
      lastName: "Martinez",
      displayName: "Sam",
      pronouns: "he/him",
      location: "Los Angeles, CA",
      ageRange: "32-38",
      relationshipStatus: "Single",
      orientation: "Curious",
      profilePhoto: "/demo-members/seed-man-16.png",
      memberType: "individual",
      interests: ["Authentic connection", "Dating and desire", "Embodiment", "Adventure"],
      whatBroughtYouHere: "Tired of surface-level dating. Looking for real connections with people who want to be fully present",
      connectionHoping: "Conversations that go beyond small talk. I want to know what makes people tick.",
      connectionComfortLevel: "Playful and authentic. I bring energy and curiosity.",
      connectionBoundaries: "Clear and open communication. I respect different comfort levels.",
      profile_tagline: "Real conversations, real connections, no games",
      completedOnboarding: true,
      joinedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      is_demo_profile: true,
    },
    {
      id: "demo-david",
      firstName: "David",
      lastName: "Lee",
      displayName: "David",
      pronouns: "he/him",
      location: "Palo Alto, CA",
      ageRange: "38-45",
      relationshipStatus: "Divorced",
      orientation: "Gay",
      profilePhoto: "/demo-members/seed-man-20.png",
      memberType: "individual",
      interests: ["Spirituality", "Touch and affection", "Authentic connection", "Personal growth"],
      whatBroughtYouHere: "After divorce, I'm rediscovering my capacity for healthy, boundaried intimacy",
      connectionHoping: "Meaningful conversations that help me heal and grow. Both intellectual and embodied connection.",
      connectionComfortLevel: "Compassionate and grounded. I value presence and intention.",
      connectionBoundaries: "Mutual respect always. We move at a pace that feels safe for both.",
      profile_tagline: "Healing is connecting",
      completedOnboarding: true,
      joinedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      is_demo_profile: true,
    },
  ];

  return demoProfiles;
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

// Fetch all profiles from database (seeded and real)
export async function getAllProfiles(): Promise<Profile[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("display_name");

    if (error) {
      console.error("Error fetching profiles:", error);
      return [];
    }

    return (data || []).map((p) => ({
      id: p.id,
      firstName: p.display_name?.split(" ")[0] || "",
      lastName: p.display_name?.split(" ").slice(1).join(" ") || "",
      displayName: p.display_name || "",
      pronouns: p.pronouns,
      location: p.location,
      ageRange: p.age_range,
      relationshipStatus: p.relationship_status,
      orientation: p.orientation,
      profilePhoto: p.profile_photo || "",
      memberType: p.member_type || "individual",
      whatBroughtYouHere: p.what_brought_you_here,
      connectionHoping: p.connection_hoping,
      interests: Array.isArray(p.interests) ? p.interests : [],
      connectionComfortLevel: p.pairing_comfort_level,
      connectionBoundaries: p.pairing_boundaries,
      quizResult: p.quiz_result,
      firstPromptResponse: p.first_prompt_response,
      firstPromptIsPublic: p.first_prompt_is_public,
      completedOnboarding: p.completed_onboarding || false,
      spacesJoined: Array.isArray(p.spaces_joined) ? p.spaces_joined : [],
      joinedAt: new Date(p.created_at),
      lastActive: p.updated_at ? new Date(p.updated_at) : undefined,
      profile_tagline: p.profile_tagline,
      show_in_member_lists: p.show_in_member_lists,
      profile_visibility: p.profile_visibility,
      show_general_location: p.show_general_location,
      show_recent_posts: p.show_recent_posts,
      is_demo_profile: p.is_seeded,
    }));
  } catch (err) {
    console.error("Error fetching profiles:", err);
    return [];
  }
}

// Fetch profiles that joined a specific space
export async function getProfilesBySpace(spaceId: string): Promise<Profile[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("display_name");

    if (error) {
      console.error("Error fetching space members:", error);
      return [];
    }

    // Filter on client side for profiles that have this space in spaces_joined
    return (data || [])
      .filter((p) => {
        const spaces = Array.isArray(p.spaces_joined) ? p.spaces_joined : [];
        return spaces.includes(spaceId);
      })
      .map((p) => ({
        id: p.id,
        firstName: p.display_name?.split(" ")[0] || "",
        lastName: p.display_name?.split(" ").slice(1).join(" ") || "",
        displayName: p.display_name || "",
        pronouns: p.pronouns,
        location: p.location,
        ageRange: p.age_range,
        relationshipStatus: p.relationship_status,
        orientation: p.orientation,
        profilePhoto: p.profile_photo || "",
        memberType: p.member_type || "individual",
        whatBroughtYouHere: p.what_brought_you_here,
        connectionHoping: p.connection_hoping,
        interests: Array.isArray(p.interests) ? p.interests : [],
        connectionComfortLevel: p.pairing_comfort_level,
        connectionBoundaries: p.pairing_boundaries,
        quizResult: p.quiz_result,
        firstPromptResponse: p.first_prompt_response,
        firstPromptIsPublic: p.first_prompt_is_public,
        completedOnboarding: p.completed_onboarding || false,
        spacesJoined: Array.isArray(p.spaces_joined) ? p.spaces_joined : [],
        joinedAt: new Date(p.created_at),
        profile_tagline: p.profile_tagline,
        show_in_member_lists: p.show_in_member_lists,
        profile_visibility: p.profile_visibility,
        show_general_location: p.show_general_location,
        show_recent_posts: p.show_recent_posts,
        is_demo_profile: p.is_seeded,
      }));
  } catch (err) {
    console.error("Error fetching space members:", err);
    return [];
  }
}

// Get member count for a specific space
export async function getMemberCountBySpace(spaceId: string): Promise<number> {
  if (!supabase) return 0;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, spaces_joined");

    if (error) {
      console.error("Error getting member count:", error);
      return 0;
    }

    // Count profiles that have this space in spaces_joined
    const count = (data || []).filter((p) => {
      const spaces = Array.isArray(p.spaces_joined) ? p.spaces_joined : [];
      return spaces.includes(spaceId);
    }).length;

    return count;
  } catch (err) {
    console.error("Error getting member count:", err);
    return 0;
  }
}
