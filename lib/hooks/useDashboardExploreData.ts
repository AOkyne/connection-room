/**
 * useDashboardExploreData Hook
 *
 * Loads "Explore" section data (community discovery and achievements).
 * These are optional queries that load in the background.
 *
 * Data loaded:
 * - User badges/achievements
 * - Suggested space for exploration
 * - Newest article/writing
 * - Offers/resources
 *
 * Returns: { badges, suggestedSpace, newestArticle, offers, loading }
 */

import { useState, useEffect } from "react";
import { getUserBadges } from "@/lib/data/badges";
import { getSuggestedSpace } from "@/lib/data/recommendations";
import { getNewestArticle, type Article } from "@/lib/data/articles";
import { getRelevantOffers } from "@/lib/data/offers";
import { withTimeout } from "@/lib/utils/with-timeout";
import { waitForAuthReady } from "@/lib/supabase/auth-ready";
import type { Profile } from "@/lib/data/profiles";

interface ExploreData {
  badges: any[];
  suggestedSpace: any | null;
  newestArticle: Article | null;
  offers: any[];
  loading: boolean;
}

export function useDashboardExploreData(profile: Profile | null, spaces: any[]): ExploreData {
  const [badges, setBadges] = useState<any[]>([]);
  const [suggestedSpace, setSuggestedSpace] = useState<any | null>(null);
  const [newestArticle, setNewestArticle] = useState<Article | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || spaces.length === 0) {
      setLoading(false);
      return;
    }

    const loadExploreData = async () => {
      try {
        // Wait for auth before querying protected tables
        await waitForAuthReady(2000);

        const results = await Promise.allSettled([
          withTimeout(getUserBadges(profile.id, profile, spaces), 5000, []).catch(err => {
            console.warn("Warning: Could not load badges", err);
            return [];
          }),
          Promise.resolve(getSuggestedSpace()),
          Promise.resolve(getNewestArticle()),
          Promise.resolve(getRelevantOffers(profile)),
        ]);

        if (results[0].status === "fulfilled") setBadges(results[0].value);
        if (results[1].status === "fulfilled") setSuggestedSpace(results[1].value);
        if (results[2].status === "fulfilled") setNewestArticle(results[2].value);
        if (results[3].status === "fulfilled") setOffers(results[3].value);
      } catch (err) {
        console.warn("Error loading explore section data:", err);
        // Try loading without auth wait
        Promise.allSettled([
          withTimeout(getUserBadges(profile.id, profile, spaces), 5000, []),
          Promise.resolve(getSuggestedSpace()),
          Promise.resolve(getNewestArticle()),
          Promise.resolve(getRelevantOffers(profile)),
        ]).then((results) => {
          if (results[0].status === "fulfilled") setBadges(results[0].value);
          if (results[1].status === "fulfilled") setSuggestedSpace(results[1].value);
          if (results[2].status === "fulfilled") setNewestArticle(results[2].value);
          if (results[3].status === "fulfilled") setOffers(results[3].value);
        });
      } finally {
        setLoading(false);
      }
    };

    loadExploreData();
  }, [profile?.id, spaces.length, profile]);

  return { badges, suggestedSpace, newestArticle, offers, loading };
}
