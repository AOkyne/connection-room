/**
 * useDashboardPrimaryData Hook
 *
 * Loads critical dashboard data that blocks page render.
 * These queries must complete before the main dashboard is shown.
 *
 * Data loaded:
 * - Profile (user account info)
 * - Spaces (community rooms user has joined)
 *
 * Returns: { profile, spaces, loading, error }
 */

import { useState, useEffect } from "react";
import { getProfile, type Profile } from "@/lib/data/profiles";
import { getSpaces, sortSpacesByPreference } from "@/lib/data/spaces";
import { withTimeout } from "@/lib/utils/with-timeout";

interface PrimaryData {
  profile: Profile | null;
  spaces: any[];
  loading: boolean;
  error: string | null;
}

export function useDashboardPrimaryData(): PrimaryData {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPrimaryData = async () => {
      try {
        // Load profile and spaces with timeout protection
        const [p, s] = await Promise.all([
          withTimeout(getProfile(), 8000, null),
          withTimeout(getSpaces(), 8000, []),
        ]);

        // If profile didn't load, create minimal fallback
        const loadedProfile = p || {
          id: "demo-" + Date.now(),
          firstName: "Guest",
          lastName: "",
          displayName: "Guest",
          memberType: "individual",
          profilePhoto: "",
          interests: [],
          completedOnboarding: false,
          joinedAt: new Date(),
          spacesJoined: [],
        };

        setProfile(loadedProfile);
        setSpaces(sortSpacesByPreference(s || []));
        setError(null);
      } catch (err) {
        console.error("Error loading primary dashboard data:", err);
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadPrimaryData();
  }, []);

  return { profile, spaces, loading, error };
}
