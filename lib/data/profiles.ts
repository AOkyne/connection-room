import { supabase } from "@/lib/supabase/client";
import { saveProfileToSupabase } from "@/lib/data/supabase-profiles";
import { demoSafeWrite } from "@/lib/demo/demo-mode-guard";
import { waitForAuthReady } from "@/lib/supabase/auth-ready";

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
  show_general_location?: boolean;
  show_recent_posts?: boolean;
  is_demo_profile?: boolean;
  inviteCode?: string;
  invitedByProfileId?: string;
  welcomeVideoWatched?: boolean;
  welcomeVideoWatchedAt?: Date;
  onboardingCompletedAt?: Date;
}

// The member-visible slice of a profile -- everything public_profiles_view
// can return, already masked server-side by each field's own show_* flag.
// Structurally narrower than Profile on purpose: it has no connection
// boundaries, no email, no unpublished quiz answers, etc, so a component
// typed against CommunityProfile cannot accidentally be handed private data
// for a cross-member render. Returned by getPublicProfile,
// getPublicProfilesBySpace, and getDiscoverableMembers -- never construct
// one from the private `profiles` table.
export interface CommunityProfile {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  pronouns?: string;
  location?: string;
  profilePhoto: string;
  memberType: string;
  interests: string[];
  completedOnboarding: boolean;
  spacesJoined?: string[];
  joinedAt: Date;
  memberSince?: Date;
  profile_tagline?: string;
  is_demo_profile?: boolean;
  ageRange?: string;
  orientation?: string;
  relationshipStatus?: string;
  whatBroughtYouHere?: string;
  connectionHoping?: string;
  quizResult?: string;
  connectionComfortLevel?: string;
  selectedReflection?: string;
}

// A member's own visibility preferences -- lives on public_profiles (not
// profiles), edited via the profile-settings UI, never touched by
// sync_public_profile() (that trigger only ever writes the derived story
// columns, never the show_*/profile_visibility columns -- see migration
// 039's and 053's comments).
export interface ProfileVisibilitySettings {
  profileVisibility: 'members_only' | 'shared_spaces' | 'hidden';
  showInDiscovery: boolean;
  showAge: boolean;
  showGeneralLocation: boolean;
  showPronouns: boolean;
  showOrientation: boolean;
  showRelationshipStatus: boolean;
  showWhyJoined: boolean;
  showConnectionIntentions: boolean;
  showInterests: boolean;
  showQuizResult: boolean;
  showConnectionComfortLevel: boolean;
  showSelectedReflection: boolean;
  showRecentPosts: boolean;
}

// A member's own email notification frequency for new space activity --
// lives on `profiles` (not public_profiles), same convention as other
// private per-user settings with no visibility dimension (e.g.
// welcome_video_watched). Nobody else ever needs to see this.
export interface NotificationPreferences {
  frequency: 'immediate' | 'daily' | 'weekly' | 'off';
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

  // Wait for the Supabase client to finish restoring the session from storage
  // before checking who's signed in — otherwise a real signed-in user can lose
  // the race on a slow/cold page load and get treated as logged out.
  await waitForAuthReady(3000);

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
      // profile_photo excluded deliberately -- some members' photos are
      // multi-megabyte base64 strings stored directly in the row (found
      // live: Trevor's own is 4.3MB). Pulling that on every single page
      // load that calls getProfile() (the nav, every dashboard section,
      // 8+ pages) was slow enough to blow past this function's own 3s
      // timeout and fall through to the hardcoded "Guest User" fallback
      // below -- a real, correctly-persisted profile, just one whose own
      // fetch couldn't finish in time. Callers that actually need to show
      // the real photo (the profile edit page's preview) fetch it
      // separately via getProfilePhoto(), so only that one place pays the
      // cost of the large transfer.
      const queryPromise = supabase
        .from("profiles")
        .select(
          "user_id, display_name, pronouns, location, age_range, relationship_status, orientation, member_type, what_brought_you_here, connection_hoping, interests, connection_comfort_level, connection_boundaries, quiz_result, first_prompt_response, first_prompt_is_public, completed_onboarding, spaces_joined, created_at, welcome_video_watched, welcome_video_watched_at, onboarding_completed_at"
        )
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
          profilePhoto: "",
          memberType: data.member_type || "individual",
          whatBroughtYouHere: data.what_brought_you_here,
          connectionHoping: data.connection_hoping,
          interests: Array.isArray(data.interests) ? data.interests : [],
          connectionComfortLevel: data.connection_comfort_level,
          connectionBoundaries: data.connection_boundaries,
          quizResult: data.quiz_result,
          firstPromptResponse: data.first_prompt_response,
          firstPromptIsPublic: data.first_prompt_is_public,
          completedOnboarding: data.completed_onboarding || false,
          spacesJoined: Array.isArray(data.spaces_joined) ? data.spaces_joined : [],
          joinedAt: new Date(data.created_at),
          welcomeVideoWatched: data.welcome_video_watched || false,
          welcomeVideoWatchedAt: data.welcome_video_watched_at ? new Date(data.welcome_video_watched_at) : undefined,
          onboardingCompletedAt: data.onboarding_completed_at ? new Date(data.onboarding_completed_at) : undefined,
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

// Fetches just the current user's photo -- separated out of getProfile()
// because some members' photos are multi-megabyte base64 strings, and
// including that in the main profile fetch (used on every page load) was
// slow enough to cause real, correctly-saved profiles to hit getProfile()'s
// timeout and fall back to the generic "Guest User" placeholder. Use this
// only where the actual image needs to be shown (e.g. the profile edit
// page's photo preview) -- most callers only need displayName/etc and
// should not pay for this.
export async function getProfilePhoto(): Promise<string> {
  if (typeof window === "undefined" || !supabase) return "";

  const userId = await getCurrentSupabaseUserId();
  if (!userId) return "";

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("profile_photo")
      .eq("user_id", userId)
      .single();

    if (error || !data) return "";
    return data.profile_photo || "";
  } catch (err) {
    console.warn("Error fetching profile photo:", err);
    return "";
  }
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

// ADMIN ONLY. Fetches full profiles rows (all fields, all members) from the
// private profiles table. As of migration 039, profiles RLS only allows an
// authenticated caller to read their own row or, if their role is 'admin',
// any row. Calling this as a non-admin member will simply return only that
// member's own row, not an error -- do not use this for any member-facing
// cross-user display; use getPublicProfile/getPublicProfilesBySpace instead.
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
      connectionComfortLevel: p.connection_comfort_level,
      connectionBoundaries: p.connection_boundaries,
      quizResult: p.quiz_result,
      firstPromptResponse: p.first_prompt_response,
      firstPromptIsPublic: p.first_prompt_is_public,
      completedOnboarding: p.completed_onboarding || false,
      spacesJoined: Array.isArray(p.spaces_joined) ? p.spaces_joined : [],
      joinedAt: new Date(p.created_at),
      lastActive: p.updated_at ? new Date(p.updated_at) : undefined,
      profile_tagline: p.profile_tagline,
      show_general_location: p.show_general_location,
      show_recent_posts: p.show_recent_posts,
      is_demo_profile: p.is_seeded,
    }));
  } catch (err) {
    console.error("Error fetching profiles:", err);
    return [];
  }
}

// ADMIN ONLY. Same data as getAllProfiles(), minus profile_photo -- some
// members' photos are multi-megabyte base64 strings stored directly in the
// row (the images should really be in Supabase Storage, not the database,
// but that's a larger migration than this fixes), and pulling + sorting
// that much text for every row measured at 11+ seconds in isolation for
// ~46 rows, well past Postgres's statement timeout under any concurrent
// load -- the confirmed cause of the admin Members page intermittently
// timing out and silently rendering "No members found". Every other field
// getAllProfiles() returns (including the age/orientation/relationship-
// status/why-joined/connection-hoping/quiz-result/comfort-level/boundaries
// fields from migration 053, none of which are large) is included here too,
// so admin list/detail views can use this instead of getAllProfiles() and
// keep full profile detail minus the one field that's actually expensive.
export async function getAllProfilesLite(): Promise<Profile[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, display_name, pronouns, location, age_range, relationship_status, orientation, member_type, what_brought_you_here, connection_hoping, interests, connection_comfort_level, connection_boundaries, quiz_result, completed_onboarding, spaces_joined, created_at, updated_at, is_seeded"
      )
      .order("display_name");

    if (error) {
      console.error("Error fetching profiles (lite):", error);
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
      profilePhoto: "",
      memberType: p.member_type || "individual",
      whatBroughtYouHere: p.what_brought_you_here,
      connectionHoping: p.connection_hoping,
      interests: Array.isArray(p.interests) ? p.interests : [],
      connectionComfortLevel: p.connection_comfort_level,
      connectionBoundaries: p.connection_boundaries,
      quizResult: p.quiz_result,
      completedOnboarding: p.completed_onboarding || false,
      spacesJoined: Array.isArray(p.spaces_joined) ? p.spaces_joined : [],
      joinedAt: new Date(p.created_at),
      lastActive: p.updated_at ? new Date(p.updated_at) : undefined,
      is_demo_profile: p.is_seeded,
    }));
  } catch (err) {
    console.error("Error fetching profiles (lite):", err);
    return [];
  }
}

// ADMIN ONLY. Fetches profile_photo for a specific set of profile ids, in
// small chunks rather than one bulk query -- getAllProfiles()'s single
// select("*") for every member measured 11+ seconds and has hit Postgres's
// statement timeout outright (confirmed live), because roughly half of
// real members' photos are still multi-megabyte base64 text stored
// directly in the row rather than a Storage URL. A single request for
// ~10 rows stays fast regardless of how many of those 10 happen to be
// base64, so callers (e.g. the Members list) should call this *after*
// already rendering getAllProfilesLite()'s fast, photo-less list, and
// merge photos in as each chunk resolves -- not block the initial render
// on it.
export async function getProfilePhotosByIds(ids: string[]): Promise<Record<string, string>> {
  if (!supabase || ids.length === 0) return {};

  const CHUNK_SIZE = 10;
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + CHUNK_SIZE));
  }

  const photosById: Record<string, string> = {};

  // A few chunks at a time, not all at once -- caps how many of these
  // queries can be competing for the same statement-timeout budget
  // concurrently.
  const CONCURRENCY = 3;
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((chunk) =>
        supabase!.from("profiles").select("id, profile_photo").in("id", chunk)
      )
    );
    for (const { data, error } of results) {
      if (error) {
        console.error("Error fetching a profile photo chunk:", error);
        continue;
      }
      (data || []).forEach((p: any) => {
        if (p.profile_photo) photosById[p.id] = p.profile_photo;
      });
    }
  }

  return photosById;
}

// Maps a public_profiles_view row to the narrower CommunityProfile shape.
// Shared by getPublicProfile/getPublicProfilesBySpace/getDiscoverableMembers
// so the three stay consistent -- any field the view masked to NULL simply
// comes through as undefined here, never a private value.
function mapCommunityProfile(p: any): CommunityProfile {
  return {
    id: p.user_id,
    firstName: p.display_name?.split(" ")[0] || "",
    lastName: p.display_name?.split(" ").slice(1).join(" ") || "",
    displayName: p.display_name || "",
    pronouns: p.pronouns,
    location: p.location,
    profilePhoto: p.profile_photo || "",
    memberType: "individual",
    interests: Array.isArray(p.interests) ? p.interests : [],
    completedOnboarding: true,
    spacesJoined: Array.isArray(p.spaces_joined) ? p.spaces_joined : [],
    joinedAt: new Date(),
    memberSince: p.member_since ? new Date(p.member_since) : undefined,
    profile_tagline: p.tagline,
    is_demo_profile: p.is_seeded,
    ageRange: p.age_range,
    orientation: p.orientation,
    relationshipStatus: p.relationship_status,
    whatBroughtYouHere: p.why_joined,
    connectionHoping: p.connection_intentions,
    quizResult: p.quiz_result,
    connectionComfortLevel: p.connection_comfort_level,
    selectedReflection: p.selected_reflection,
  };
}

// Fetch a single member's PUBLIC profile (safe fields only) by user_id.
// Sourced from public_profiles_view, not profiles -- profiles is locked to
// owner+admin as of migration 039. Use this for any page rendering another
// member's profile; never fall back to getAllProfiles for cross-member
// reads, that remains admin-only (it reads the private profiles table,
// which ordinary members can no longer SELECT for other users).
export async function getPublicProfile(userId: string): Promise<CommunityProfile | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("public_profiles_view")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;

    return mapCommunityProfile(data);
  } catch (err) {
    console.error("Error fetching public profile:", err);
    return null;
  }
}

// Fetch PUBLIC profiles (safe fields only) of members who joined a space.
export async function getPublicProfilesBySpace(spaceId: string): Promise<CommunityProfile[]> {
  if (!supabase) return [];

  try {
    // profiles.spaces_joined (and public_profiles.spaces_joined, synced
    // from it) is never actually kept up to date for real members -- found
    // live: Trevor has 8 rows in space_memberships (the real source of
    // truth for who's in a space, already used by getMemberCountBySpace()/
    // getSpaceStats()) but an empty spaces_joined array. Filtering on that
    // column here meant this function has returned zero members for every
    // real space, for every real member, since it was introduced -- fixed
    // by looking up membership from space_memberships first, matching the
    // pattern already used elsewhere.
    const { data: memberships, error: membershipsError } = await supabase
      .from("space_memberships")
      .select("user_id")
      .eq("space_id", spaceId);

    if (membershipsError) {
      console.error("Error fetching space memberships:", membershipsError);
      return [];
    }

    const memberUserIds = (memberships || []).map((m: any) => m.user_id);
    if (memberUserIds.length === 0) return [];

    // Excludes members who haven't completed onboarding (migration 059) --
    // an unfinished profile shouldn't be shown to other members as if it
    // were a real, present community member yet.
    const { data, error } = await supabase
      .from("public_profiles_view")
      .select("*")
      .in("user_id", memberUserIds)
      .eq("completed_onboarding", true)
      .order("display_name");

    if (error) {
      console.error("Error fetching public space members:", error);
      return [];
    }

    return (data || []).map(mapCommunityProfile);
  } catch (err) {
    console.error("Error fetching public space members:", err);
    return [];
  }
}

// Fetch a sample of real, discoverable members (safe fields only) for
// general "community" widgets that aren't scoped to one space -- e.g. the
// dashboard's CommunityMembersGrid, which was hardcoded to a demo seed
// array (lib/seed/demo-members) and never queried real members at all.
// Respects each member's own show_in_discovery opt-out in addition to the
// row-level visibility public_profiles_view already enforces.
export async function getDiscoverableMembers(limit: number = 20): Promise<CommunityProfile[]> {
  if (!supabase) return [];

  try {
    // Excludes members who haven't completed onboarding (migration 059) --
    // same rationale as getPublicProfilesBySpace().
    const { data, error } = await supabase
      .from("public_profiles_view")
      .select("*")
      .eq("show_in_discovery", true)
      .eq("completed_onboarding", true)
      .limit(limit);

    if (error) {
      console.error("Error fetching discoverable members:", error);
      return [];
    }

    return (data || []).map(mapCommunityProfile);
  } catch (err) {
    console.error("Error fetching discoverable members:", err);
    return [];
  }
}

// Self-only: read the caller's own visibility preferences from
// public_profiles. Separate from getProfile() (which reads profiles) --
// visibility flags live on the public table, not the private one.
export async function getProfileVisibilitySettings(): Promise<ProfileVisibilitySettings | null> {
  if (typeof window === "undefined" || !supabase) return null;

  const userId = await getCurrentSupabaseUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from("public_profiles")
      .select(
        "profile_visibility, show_in_discovery, show_age, show_general_location, show_pronouns, show_orientation, show_relationship_status, show_why_joined, show_connection_intentions, show_interests, show_quiz_result, show_connection_comfort_level, show_selected_reflection, show_recent_posts"
      )
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;

    return {
      profileVisibility: (data.profile_visibility as ProfileVisibilitySettings["profileVisibility"]) || "members_only",
      showInDiscovery: data.show_in_discovery ?? true,
      showAge: data.show_age ?? true,
      showGeneralLocation: data.show_general_location ?? true,
      showPronouns: data.show_pronouns ?? true,
      showOrientation: data.show_orientation ?? true,
      showRelationshipStatus: data.show_relationship_status ?? true,
      showWhyJoined: data.show_why_joined ?? true,
      showConnectionIntentions: data.show_connection_intentions ?? true,
      showInterests: data.show_interests ?? true,
      showQuizResult: data.show_quiz_result ?? false,
      showConnectionComfortLevel: data.show_connection_comfort_level ?? false,
      showSelectedReflection: data.show_selected_reflection ?? false,
      showRecentPosts: data.show_recent_posts ?? false,
    };
  } catch (err) {
    console.warn("Error fetching profile visibility settings:", err);
    return null;
  }
}

// Self-only: write visibility preferences straight to public_profiles.
// Deliberately does NOT go through saveProfile()/profiles -- these flags
// live on the public table (public_profiles_owner_update RLS policy already
// allows the owner to write them directly), and sync_public_profile() never
// touches them, so there's no trigger to fight with.
export async function updateProfileVisibilitySettings(
  settings: Partial<ProfileVisibilitySettings>
): Promise<boolean> {
  if (typeof window === "undefined" || !supabase) return false;
  const client = supabase;

  const userId = await getCurrentSupabaseUserId();
  if (!userId) return false;

  const payload: Record<string, unknown> = {};
  if (settings.profileVisibility !== undefined) payload.profile_visibility = settings.profileVisibility;
  if (settings.showInDiscovery !== undefined) payload.show_in_discovery = settings.showInDiscovery;
  if (settings.showAge !== undefined) payload.show_age = settings.showAge;
  if (settings.showGeneralLocation !== undefined) payload.show_general_location = settings.showGeneralLocation;
  if (settings.showPronouns !== undefined) payload.show_pronouns = settings.showPronouns;
  if (settings.showOrientation !== undefined) payload.show_orientation = settings.showOrientation;
  if (settings.showRelationshipStatus !== undefined) payload.show_relationship_status = settings.showRelationshipStatus;
  if (settings.showWhyJoined !== undefined) payload.show_why_joined = settings.showWhyJoined;
  if (settings.showConnectionIntentions !== undefined) payload.show_connection_intentions = settings.showConnectionIntentions;
  if (settings.showInterests !== undefined) payload.show_interests = settings.showInterests;
  if (settings.showQuizResult !== undefined) payload.show_quiz_result = settings.showQuizResult;
  if (settings.showConnectionComfortLevel !== undefined) payload.show_connection_comfort_level = settings.showConnectionComfortLevel;
  if (settings.showSelectedReflection !== undefined) payload.show_selected_reflection = settings.showSelectedReflection;
  if (settings.showRecentPosts !== undefined) payload.show_recent_posts = settings.showRecentPosts;

  const { error } = await demoSafeWrite(
    async () => client.from("public_profiles").update(payload).eq("user_id", userId),
    { context: "updateProfileVisibilitySettings" }
  );

  if (error) {
    console.error("Error updating profile visibility settings:", error);
    return false;
  }
  return true;
}

// Self-only: read the caller's own notification frequency from profiles
// (not public_profiles -- this has no visibility dimension, nobody else
// ever needs to see it).
export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
  if (typeof window === "undefined" || !supabase) return null;

  const userId = await getCurrentSupabaseUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("notification_frequency")
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;

    return {
      frequency: (data.notification_frequency as NotificationPreferences["frequency"]) || "daily",
    };
  } catch (err) {
    console.warn("Error fetching notification preferences:", err);
    return null;
  }
}

// Self-only: write the caller's notification frequency straight to
// profiles (owner-update RLS already allows this).
export async function updateNotificationPreferences(
  settings: Partial<NotificationPreferences>
): Promise<boolean> {
  if (typeof window === "undefined" || !supabase) return false;
  const client = supabase;

  const userId = await getCurrentSupabaseUserId();
  if (!userId) return false;

  if (settings.frequency === undefined) return true;

  const { error } = await demoSafeWrite(
    async () =>
      client.from("profiles").update({ notification_frequency: settings.frequency }).eq("user_id", userId),
    { context: "updateNotificationPreferences" }
  );

  if (error) {
    console.error("Error updating notification preferences:", error);
    return false;
  }
  return true;
}

// Get member count for a specific space. Counts space_memberships rather
// than profiles.spaces_joined -- profiles is locked to owner+admin SELECT
// as of migration 039, so a non-admin member would only ever see their
// own row here and get a wrong (0 or 1) count. space_memberships has its
// own, broader read policy and was never part of the private-profile
// lockdown.
export async function getMemberCountBySpace(spaceId: string): Promise<number> {
  if (!supabase) return 0;

  try {
    const { count, error } = await supabase
      .from("space_memberships")
      .select("id", { count: "exact", head: true })
      .eq("space_id", spaceId);

    if (error) {
      console.error("Error getting member count:", error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error("Error getting member count:", err);
    return 0;
  }
}
