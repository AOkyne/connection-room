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
  // No timeout previously wrapped this request at all -- if the browser's
  // fetch to Supabase never resolves (confirmed live: a brand-new signup's
  // profile row had never received a single successful write across 3
  // separate submit attempts, created_at and updated_at identical to the
  // millisecond), the Save button just hangs indefinitely with no error,
  // which is exactly what "the button seems unresponsive" and "I've
  // submitted 3 times" both describe. A bounded timeout guarantees every
  // caller eventually gets a real answer -- success, or a clear failure
  // they can actually see and retry from -- instead of silence.
  const WRITE_TIMEOUT_MS = 15000;
  const writePromise = demoSafeWrite(
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
          // created_at is deliberately never part of this upsert -- it
          // should only ever be set once, at the real first insert (the
          // column's own DEFAULT NOW() handles that). Writing
          // profile.joinedAt here on every save reset a member's real
          // signup date to "right now" any time the in-memory profile's
          // joinedAt didn't match the DB (confirmed live: a getProfile()
          // fetch failure populated joinedAt with the current time via
          // its fallback object, and the next save silently overwrote the
          // real created_at with it).
          welcome_video_watched: profile.welcomeVideoWatched,
          welcome_video_watched_at: profile.welcomeVideoWatchedAt,
          onboarding_completed_at: profile.onboardingCompletedAt,
          // Migration 065: previously typed on the Profile interface and
          // read/written by the onboarding page, but with no backing
          // column here -- silently dropped on every save, so the photo
          // step's confirmation checkbox reset on every reload and
          // onboarding never remembered which step a member was on.
          onboarding_step: profile.onboardingStep,
          photo_confirmed: profile.photo_confirmed,
          photo_confirmed_at: profile.photo_confirmed_at,
          profile_tagline: profile.profile_tagline,
          updated_at: new Date(),
        },
        { onConflict: "user_id" }
      )
      .select(),
    { context: "saveProfileToSupabase" }
  );

  const timeoutPromise = new Promise<{ data: null; error: { message: string; code?: string; details?: string; hint?: string } }>(
    (resolve) =>
      setTimeout(
        () => resolve({ data: null, error: { message: `Profile save timed out after ${WRITE_TIMEOUT_MS}ms` } }),
        WRITE_TIMEOUT_MS
      )
  );

  const { data, error } = await Promise.race([writePromise, timeoutPromise]);

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
        // The actual column is created_at -- profileData.joined_at never
        // existed, so this was always an Invalid Date.
        joinedAt: new Date(profileData.created_at),
        welcomeVideoWatched: profileData.welcome_video_watched || false,
        welcomeVideoWatchedAt: profileData.welcome_video_watched_at ? new Date(profileData.welcome_video_watched_at) : undefined,
        onboardingCompletedAt: profileData.onboarding_completed_at ? new Date(profileData.onboarding_completed_at) : undefined,
        onboardingStep: profileData.onboarding_step || undefined,
        photo_confirmed: profileData.photo_confirmed || false,
        photo_confirmed_at: profileData.photo_confirmed_at ? new Date(profileData.photo_confirmed_at) : undefined,
        profile_tagline: profileData.profile_tagline || undefined,
      }
    : null;
}

