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
import { getProfile, getProfilePhoto, type Profile } from "@/lib/data/profiles";
import { getSpaces, sortSpacesByPreference } from "@/lib/data/spaces";
import { withTimeout } from "@/lib/utils/with-timeout";

interface PrimaryData {
  profile: Profile | null;
  spaces: any[];
  loading: boolean;
  error: string | null;
}

// getProfile() already runs its own two-stage retry internally (4s, then
// 8s -- up to ~12s worst case, see its own comment). This wrapper's
// timeout only exists as a last-resort safety net against a genuinely
// hung promise, so it's set comfortably above that ~12s ceiling --
// previously this was 8000ms, which could (and did, live) fire *during*
// getProfile()'s own second attempt and discard it before it had a
// chance to succeed.
const PROFILE_TIMEOUT_MS = 15000;

export function useDashboardPrimaryData(): PrimaryData {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPrimaryData = async () => {
      try {
        const [p, s] = await Promise.all([
          withTimeout(getProfile(), PROFILE_TIMEOUT_MS, null),
          withTimeout(getSpaces(), 8000, []),
        ]);

        // A real signed-in member whose profile fetch failed/timed out is
        // a load failure, not "nobody's logged in" -- confirmed live: this
        // used to fabricate a fake "Guest" profile on any timeout, which
        // silently told an actual member they weren't recognized instead
        // of showing the retry screen this page already has (below, gated
        // on `error`/`loadError` in app/app/page.tsx). getProfile() itself
        // only ever returns null for "truly no session" or "exhausted its
        // own retries" -- neither of which this page should paper over
        // with a made-up identity.
        if (!p) {
          setError("Failed to load your profile");
          setLoading(false);
          return;
        }

        // getProfile() deliberately excludes the legacy base64
        // profile_photo column (see its own comment -- large values were
        // blowing past its timeout for every page that calls it, not just
        // this one). Fetched separately and non-blocking, same pattern as
        // the profile edit page, so members whose photo was never
        // migrated to Storage (profile_photo_path) still see their real
        // photo here instead of a bare initials avatar.
        getProfilePhoto().then((photo) => {
          if (photo) setProfile((prev) => (prev ? { ...prev, profilePhoto: photo } : prev));
        });

        setProfile(p);
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
