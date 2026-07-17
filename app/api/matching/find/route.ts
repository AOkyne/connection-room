import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";

// Server-side connection matching. Scoring needs relationship_status/
// age_range/location, which are private fields ordinary members can no
// longer SELECT for each other directly (see migration 039). This route
// runs the scoring with the service-role key (bypassing RLS) but only ever
// returns safe, public-profile-equivalent fields back to the client -- the
// private fields used for scoring never leave the server.
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase, userId } = auth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    userPreferences,
    connectionHistory = [],
    declinedUserIds = [],
    blockedUserIds = [],
    limit = 5,
  } = body;

  if (userPreferences?.frequency === "pause") {
    return NextResponse.json({ matches: [] });
  }

  const { data: selfRow, error: selfError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (selfError || !selfRow) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: candidates, error: candidatesError } = await supabase
    .from("profiles")
    .select("*")
    .neq("user_id", userId);

  if (candidatesError) {
    return NextResponse.json({ error: "Failed to load candidates" }, { status: 500 });
  }

  // Scoring below deliberately reads the private profiles rows (needs
  // relationship_status/age_range/location regardless of whether a
  // candidate has chosen to display them). What's actually returned to the
  // client comes from public_profiles_view instead (masked per each
  // candidate's own show_* flags) -- this uses the service-role client, so
  // RLS row-restrictions don't apply, but the view's CASE WHEN column
  // masking isn't RLS, it's baked into the view's query itself and still
  // runs regardless of role. A hidden profile must not appear as a
  // suggestion at all (same rule as discovery/member lists), so those are
  // filtered out of the candidate pool entirely, not just column-masked.
  const { data: candidateViewRows, error: viewError } = await supabase
    .from("public_profiles_view")
    .select("*")
    .neq("user_id", userId);

  if (viewError) {
    return NextResponse.json({ error: "Failed to load candidate visibility" }, { status: 500 });
  }

  const selfSpaces = new Set(Array.isArray(selfRow.spaces_joined) ? selfRow.spaces_joined : []);

  const visibleProfileByUserId = new Map(
    (candidateViewRows || [])
      .filter((v) => {
        if (v.profile_visibility === "hidden") return false;
        if (v.profile_visibility === "shared_spaces") {
          const candidateSpaces: string[] = Array.isArray(v.spaces_joined) ? v.spaces_joined : [];
          return candidateSpaces.some((s) => selfSpaces.has(s));
        }
        return true;
      })
      .map((v) => [v.user_id, v])
  );

  const connectedUserIds = new Set(
    (connectionHistory as any[])
      .filter((conn) => conn.status === "completed" || conn.status === "active")
      .map((conn) => conn.partnerId)
  );
  const declinedSet = new Set(declinedUserIds as string[]);
  const blockedSet = new Set(blockedUserIds as string[]);

  const scored = (candidates || [])
    .filter((p) => {
      if (
        !p.completed_onboarding ||
        !p.profile_photo ||
        !Array.isArray(p.interests) ||
        p.interests.length === 0
      ) {
        return false;
      }
      if (!visibleProfileByUserId.has(p.user_id)) return false;
      if (connectedUserIds.has(p.user_id)) return false;
      if (declinedSet.has(p.user_id)) return false;
      if (blockedSet.has(p.user_id)) return false;
      if (userPreferences?.frequency === "pause" || p.connection_frequency === "pause") return false;
      return true;
    })
    .map((p) => {
      const sharedInterests = calculateSharedInterests(selfRow.interests || [], p.interests || []);
      const score = calculateMatchScore(selfRow, p, sharedInterests);
      return { candidate: p, score, sharedInterests };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((m) => ({
      profile: toSafeProfile(visibleProfileByUserId.get(m.candidate.user_id)),
      score: m.score,
      sharedInterests: m.sharedInterests,
    }));

  return NextResponse.json({ matches: scored });
}

function calculateSharedInterests(userInterests: string[], profileInterests: string[]): string[] {
  return userInterests.filter((interest) =>
    profileInterests.some((pi) => pi.toLowerCase() === interest.toLowerCase())
  );
}

// Returns a 0-100 percentage, never more -- the previous version added
// sharedInterests.length * 30 with no cap, so 11 shared interests scored
// 330 and rendered as "330% match" (SuggestedConnections.tsx displays the
// score directly as `${score}% match`). Interest overlap is scaled by how
// much of the smaller person's interest list is shared, rather than the
// raw shared count, so someone with many interests can't blow past 100%
// just by having a lot of them; the remaining signals (location,
// relationship status, age) are capped bonus points on top.
function calculateMatchScore(selfRow: any, candidate: any, sharedInterests: string[]): number {
  let score = 0;

  const selfInterestCount = Array.isArray(selfRow.interests) ? selfRow.interests.length : 0;
  const candidateInterestCount = Array.isArray(candidate.interests) ? candidate.interests.length : 0;
  const smallerInterestCount = Math.min(selfInterestCount, candidateInterestCount) || 1;
  const interestOverlapRatio = Math.min(sharedInterests.length / smallerInterestCount, 1);
  score += interestOverlapRatio * 60;

  if (selfRow.location && candidate.location && selfRow.location.toLowerCase() === candidate.location.toLowerCase()) {
    score += 15;
  }

  if (selfRow.relationship_status && candidate.relationship_status) {
    const compatible =
      (selfRow.relationship_status === "Married" && candidate.relationship_status === "Married") ||
      (selfRow.relationship_status === "Single" && candidate.relationship_status === "Single") ||
      selfRow.relationship_status === "Divorced" ||
      candidate.relationship_status === "Divorced";
    if (compatible) score += 10;
  }

  if (selfRow.age_range && candidate.age_range) {
    const ageProximity = Math.abs(extractMidpoint(selfRow.age_range) - extractMidpoint(candidate.age_range));
    if (ageProximity <= 10) score += 15;
  }

  return Math.min(Math.round(score), 100);
}

function extractMidpoint(ageRange: string): number {
  const match = ageRange.match(/(\d+)-(\d+)/);
  if (match) {
    return (parseInt(match[1]) + parseInt(match[2])) / 2;
  }
  return 0;
}

// Built from a public_profiles_view row, not the raw private profiles row --
// every field here has already been masked per the candidate's own show_*
// flags (a hidden orientation/relationship_status/etc comes through as
// NULL from the view, not omitted here). This is a CommunityProfile.
function toSafeProfile(viewRow: any) {
  return {
    id: viewRow.user_id,
    firstName: viewRow.display_name?.split(" ")[0] || "",
    lastName: viewRow.display_name?.split(" ").slice(1).join(" ") || "",
    displayName: viewRow.display_name || "",
    pronouns: viewRow.pronouns,
    location: viewRow.location,
    profilePhoto: viewRow.profile_photo || "",
    memberType: "individual",
    interests: Array.isArray(viewRow.interests) ? viewRow.interests : [],
    completedOnboarding: true,
    spacesJoined: Array.isArray(viewRow.spaces_joined) ? viewRow.spaces_joined : [],
    joinedAt: viewRow.member_since,
    memberSince: viewRow.member_since,
    profile_tagline: viewRow.tagline,
    is_demo_profile: viewRow.is_seeded,
    ageRange: viewRow.age_range,
    orientation: viewRow.orientation,
    relationshipStatus: viewRow.relationship_status,
    whatBroughtYouHere: viewRow.why_joined,
    connectionHoping: viewRow.connection_intentions,
    quizResult: viewRow.quiz_result,
    connectionComfortLevel: viewRow.connection_comfort_level,
    selectedReflection: viewRow.selected_reflection,
  };
}
