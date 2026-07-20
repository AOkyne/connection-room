import { supabase } from "@/lib/supabase/client";
import { demoSafeWrite } from "@/lib/demo/demo-mode-guard";
import { buildProfilePhotoUrl } from "@/lib/utils/storage";
import type { Profile, CoupleProfile } from "./profiles";

// Create or update profile in Supabase
export async function saveProfileToSupabase(profile: Profile): Promise<Profile | null> {
  if (!supabase) {
    return null;
  }
  const client = supabase;

  // Wrap with demo mode protection
  //
  // profile_photo_path is only included when the caller just uploaded a
  // new photo (profilePhotoPath set -- see uploadProfilePhoto() and its
  // three call sites). getProfile() stopped fetching the legacy
  // profile_photo column (some photos are multi-megabyte base64 strings
  // that were slow enough to cause real profiles to time out and show as
  // "Guest" -- see its own comment) and now resolves profilePhoto from
  // profile_photo_path when present, so any updateProfile() call that
  // merges onto a getProfile() snapshot carries a real, already-resolved
  // URL or "" in profilePhoto, never the legacy value -- omitting keys
  // entirely when there's nothing new to write leaves existing columns
  // untouched instead of overwriting them with that resolved/blank value.
  //
  // Migration 064: profile_photo (legacy base64) is intentionally never
  // written here anymore, by anyone -- new uploads only ever populate
  // profile_photo_path (Supabase Storage). The legacy column is left
  // alone for existing rows until a separate one-time backfill migrates
  // them; see PROFILE_PHOTO_MIGRATION notes.
  const { data, error } = await demoSafeWrite(
    async () => client
      .from("profiles")
      .upsert(
        {
          user_id: profile.id,
          display_name: profile.displayName,
          // Migration 060 -- previously never written at all, only
          // display_name (deliberately truncated to "First L." for
          // member-facing display), so the real full last name was
          // discarded at save time and unrecoverable afterward, including
          // by the member's own profile-edit page.
          first_name: profile.firstName,
          last_name: profile.lastName,
          pronouns: profile.pronouns,
          location: profile.location,
          age_range: profile.ageRange,
          relationship_status: profile.relationshipStatus,
          orientation: profile.orientation,
          ...(profile.profilePhotoPath
            ? { profile_photo_path: profile.profilePhotoPath, profile_photo_updated_at: new Date() }
            : {}),
          member_type: profile.memberType,
          what_brought_you_here: profile.whatBroughtYouHere,
          connection_hoping: profile.connectionHoping,
          interests: profile.interests,
          connection_comfort_level: profile.connectionComfortLevel,
          connection_boundaries: profile.connectionBoundaries,
          quiz_result: profile.quizResult,
          first_prompt_response: profile.firstPromptResponse,
          first_prompt_is_public: profile.firstPromptIsPublic,
          completed_onboarding: profile.completedOnboarding,
          spaces_joined: profile.spacesJoined,
          created_at: profile.joinedAt,
          welcome_video_watched: profile.welcomeVideoWatched,
          welcome_video_watched_at: profile.welcomeVideoWatchedAt,
          onboarding_completed_at: profile.onboardingCompletedAt,
          updated_at: new Date(),
        },
        { onConflict: "user_id" }
      )
      .select(),
    { context: "saveProfileToSupabase" }
  );

  if (error) {
    console.error("Error saving profile to Supabase:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      full: error
    });
    return null;
  }

  // Handle array response from select()
  const profileData = Array.isArray(data) ? data[0] : data;

  return profileData
    ? {
        id: profileData.user_id || profileData.id,
        firstName: profileData.first_name || profile.firstName,
        lastName: profileData.last_name || profile.lastName,
        displayName: profileData.display_name,
        pronouns: profileData.pronouns,
        location: profileData.location,
        ageRange: profileData.age_range,
        relationshipStatus: profileData.relationship_status,
        orientation: profileData.orientation,
        profilePhoto: profileData.profile_photo_path
          ? buildProfilePhotoUrl(profileData.profile_photo_path)
          : profileData.profile_photo || "",
        profilePhotoPath: profileData.profile_photo_path || undefined,
        memberType: profileData.member_type,
        whatBroughtYouHere: profileData.what_brought_you_here,
        connectionHoping: profileData.connection_hoping,
        interests: profileData.interests || [],
        connectionComfortLevel: profileData.connection_comfort_level,
        connectionBoundaries: profileData.connection_boundaries,
        quizResult: profileData.quiz_result,
        firstPromptResponse: profileData.first_prompt_response,
        firstPromptIsPublic: profileData.first_prompt_is_public,
        completedOnboarding: profileData.completed_onboarding,
        spacesJoined: profileData.spaces_joined || [],
        joinedAt: new Date(profileData.joined_at),
        welcomeVideoWatched: profileData.welcome_video_watched || false,
        welcomeVideoWatchedAt: profileData.welcome_video_watched_at ? new Date(profileData.welcome_video_watched_at) : undefined,
        onboardingCompletedAt: profileData.onboarding_completed_at ? new Date(profileData.onboarding_completed_at) : undefined,
      }
    : null;
}

