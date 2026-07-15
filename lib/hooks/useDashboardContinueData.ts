/**
 * useDashboardContinueData Hook
 *
 * Loads "Continue" section data (recent activity and next steps).
 * These are non-blocking queries that load after primary data.
 *
 * Data loaded:
 * - Recent reflections (last 5)
 * - Upcoming events (next 2)
 *
 * Returns: { recentReflections, upcomingEvents, loading }
 */

import { useState, useEffect } from "react";
import { getRecentReflections, type RecentReflection } from "@/lib/data/reflections";
import { getUpcomingEvents } from "@/lib/data/events";
import { withTimeout } from "@/lib/utils/with-timeout";
import { waitForAuthReady } from "@/lib/supabase/auth-ready";

interface ContinueData {
  recentReflections: RecentReflection[];
  upcomingEvents: any[];
  loading: boolean;
}

export function useDashboardContinueData(): ContinueData {
  const [recentReflections, setRecentReflections] = useState<RecentReflection[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContinueData = async () => {
      try {
        // Wait for auth session to be initialized before querying protected tables
        await waitForAuthReady(2000);

        // Load reflections and events
        const results = await Promise.allSettled([
          withTimeout(getRecentReflections(5), 3000, []).catch(err => {
            console.warn("Warning: Could not load reflections", err);
            return [];
          }),
          getUpcomingEvents().then(events => events.slice(0, 2)),
        ]);

        if (results[0].status === "fulfilled") {
          setRecentReflections(results[0].value);
        }
        if (results[1].status === "fulfilled") {
          setUpcomingEvents(results[1].value);
        }
      } catch (err) {
        console.warn("Error loading continue section data:", err);
        // Continue with empty state if auth check fails
        Promise.allSettled([
          withTimeout(getRecentReflections(5), 3000, []),
          getUpcomingEvents().then(events => events.slice(0, 2)),
        ]).then((results) => {
          if (results[0].status === "fulfilled") setRecentReflections(results[0].value);
          if (results[1].status === "fulfilled") setUpcomingEvents(results[1].value);
        });
      } finally {
        setLoading(false);
      }
    };

    loadContinueData();
  }, []);

  return { recentReflections, upcomingEvents, loading };
}
