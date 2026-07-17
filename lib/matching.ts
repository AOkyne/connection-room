import type { Profile, CommunityProfile } from "./data/profiles";
import { supabase } from "@/lib/supabase/client";

export interface MatchScore {
  profile: CommunityProfile;
  score: number;
  sharedInterests: string[];
}

// Calls /api/matching/find, which runs the actual scoring server-side with
// the service-role key. Scoring needs relationship_status/age_range/
// location, which are private fields (migration 039 locked profiles down to
// owner+admin SELECT) -- this client-side function only ever sees the safe
// fields the API route chooses to return, never the raw candidate rows.
export async function findMatches(
  userProfile: Profile,
  userPreferences: any,
  connectionHistory: any[] = [],
  declinedUserIds: string[] = [],
  blockedUserIds: string[] = [],
  limit: number = 5
): Promise<MatchScore[]> {
  if (!supabase) return [];

  try {
    if (userPreferences?.frequency === "pause") {
      return [];
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return [];

    const response = await fetch("/api/matching/find", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userPreferences,
        connectionHistory,
        declinedUserIds,
        blockedUserIds,
        limit,
      }),
    });

    if (!response.ok) {
      console.error("Error finding matches:", await response.text());
      return [];
    }

    const { matches } = await response.json();
    return (matches || []).map((m: any) => ({
      ...m,
      profile: { ...m.profile, joinedAt: new Date(m.profile.joinedAt) },
    }));
  } catch (err) {
    console.error("Error finding matches:", err);
    return [];
  }
}
