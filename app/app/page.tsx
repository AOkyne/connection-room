"use client";

import { useRouter } from "next/navigation";
import { getProfile, type Profile } from "@/lib/data/profiles";
import { getSpaces, sortSpacesByPreference } from "@/lib/data/spaces";
import { DashboardTodaySection } from "@/components/dashboard/DashboardTodaySection";
import { WelcomeBackBanner } from "@/components/dashboard/WelcomeBackBanner";
import { DashboardContinueSection } from "@/components/dashboard/DashboardContinueSection";
import { DashboardExploreSection } from "@/components/dashboard/DashboardExploreSection";
import { useDashboardPrimaryData } from "@/lib/hooks/useDashboardPrimaryData";
import { useDashboardContinueData } from "@/lib/hooks/useDashboardContinueData";
import { useDashboardExploreData } from "@/lib/hooks/useDashboardExploreData";
import { LoadingError } from "@/components/LoadingError";
import { ToastContainer } from "@/components/Toast";
import { useToast } from "@/lib/hooks/useToast";
import { withTimeout } from "@/lib/utils/with-timeout";
import { useEffect, useState } from "react";

export default function AppHome() {
  const { toasts, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // PHASE 1: Load critical data (profile + spaces) with timeout
  const { profile, spaces, loading: primaryLoading, error: primaryError } = useDashboardPrimaryData();

  // PHASE 2: Load secondary data (non-blocking)
  const { recentReflections, upcomingEvents, loading: continueLoading } = useDashboardContinueData();

  // PHASE 3: Load exploratory data (optional)
  const { badges, suggestedSpace, newestArticle, offers, loading: exploreLoading } =
    useDashboardExploreData(profile, spaces);

  useEffect(() => {
    // Set timeout for total page load
    const timeoutId = setTimeout(() => {
      if (!mounted && primaryLoading) {
        setLoadError("Home page is taking too long to load");
      }
    }, 25000);

    // Mark page as mounted when primary data is ready
    if (!primaryLoading && profile) {
      clearTimeout(timeoutId);
      setMounted(true);
      setLoadError(null);
    }

    return () => clearTimeout(timeoutId);
  }, [primaryLoading, profile, mounted]);

  if (loadError && !mounted) {
    return (
      <LoadingError
        message={loadError}
        onRetry={() => {
          setLoadError(null);
          setMounted(false);
          window.location.reload();
        }}
      />
    );
  }

  if (!mounted || !profile || primaryLoading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <div className="flex justify-center mb-4">
              <div className="animate-spin h-16 w-16 border-4 border-[#d4a348] border-t-transparent rounded-full" />
            </div>
            <h2 className="text-3xl text-[#1a0f0a] font-semibold">Getting ready for the big reveal</h2>
            <p className="text-lg text-[#1a0f0a] max-w-md mx-auto">
              We're gathering your personalized experience. Just a moment...
            </p>
          </div>
          <div className="pt-8">
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#d4a348] animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-[#d4a348] animate-pulse delay-100" />
              <div className="w-2 h-2 rounded-full bg-[#d4a348] animate-pulse delay-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Welcome back -- surfaces the same unread count already shown in the nav badges */}
      <WelcomeBackBanner firstName={profile.firstName} />

      {/* THREE-TIER DASHBOARD HIERARCHY */}

      {/* TIER 1: TODAY (Above the fold) - Primary blocking content */}
      <DashboardTodaySection
        displayName={profile.displayName}
        userId={profile.id}
      />

      {/* TIER 2: CONTINUE (Secondary content) - Non-blocking */}
      <DashboardContinueSection
        profile={profile}
        recentReflections={recentReflections}
        upcomingEvents={upcomingEvents}
        loading={continueLoading}
      />

      {/* TIER 3: EXPLORE (Below the fold) - Optional content */}
      <DashboardExploreSection
        profile={profile}
        spaces={spaces}
        badges={badges}
        newestArticle={newestArticle}
        recentReflections={recentReflections}
        upcomingEvents={upcomingEvents}
        loading={exploreLoading}
      />
    </div>
  );
}
