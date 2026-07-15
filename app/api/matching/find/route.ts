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
      profile: toSafeProfile(m.candidate),
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

function calculateMatchScore(selfRow: any, candidate: any, sharedInterests: string[]): number {
  let score = 0;
  score += sharedInterests.length * 30;

  if (selfRow.location && candidate.location && selfRow.location.toLowerCase() === candidate.location.toLowerCase()) {
    score += 20;
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
    if (ageProximity <= 10) score += 10;
  }

  return score;
}

function extractMidpoint(ageRange: string): number {
  const match = ageRange.match(/(\d+)-(\d+)/);
  if (match) {
    return (parseInt(match[1]) + parseInt(match[2])) / 2;
  }
  return 0;
}

// Only safe, public-profile-equivalent fields -- no relationship_status,
// orientation, connection_comfort_level, connection_boundaries, quiz_result,
// what_brought_you_here, connection_hoping, or age_range.
function toSafeProfile(dbProfile: any) {
  return {
    id: dbProfile.user_id,
    firstName: dbProfile.display_name?.split(" ")[0] || "",
    lastName: dbProfile.display_name?.split(" ").slice(1).join(" ") || "",
    displayName: dbProfile.display_name || "",
    pronouns: dbProfile.pronouns,
    location: dbProfile.location,
    profilePhoto: dbProfile.profile_photo || "",
    memberType: dbProfile.member_type || "individual",
    interests: Array.isArray(dbProfile.interests) ? dbProfile.interests : [],
    completedOnboarding: dbProfile.completed_onboarding || false,
    spacesJoined: Array.isArray(dbProfile.spaces_joined) ? dbProfile.spaces_joined : [],
    joinedAt: dbProfile.created_at,
    is_demo_profile: dbProfile.is_seeded,
  };
}
