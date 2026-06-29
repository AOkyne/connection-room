"use client";

import { useRouter } from "next/navigation";
import { getProfile, type Profile } from "@/lib/data/profiles";
import { getSpaces } from "@/lib/data/spaces";
import { getRecommendedNextStep, getTodaysPrompt, getSuggestedSpace } from "@/lib/data/recommendations";
import { getUserBadges } from "@/lib/data/badges";
import { getUpcomingEvents } from "@/lib/data/events";
import { getRelevantOffers } from "@/lib/data/offers";
import { getRecentReflections, type RecentReflection } from "@/lib/data/reflections";
import { initializeDailyCompanion } from "@/lib/seed/init-daily-companion";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { IconReflection, IconProgress, IconUpcoming, IconBadges, IconForYou, IconDemo } from "@/components/Icons";
import { SpaceIconSVG } from "@/components/SpaceIconSVG";
import { getBadgeIcon } from "@/lib/badge-icons";
import { getOfferIcon } from "@/lib/offer-icons";
import { getIconComponent } from "@/lib/icon-lookup";
import { FirstWeekDashboardCard } from "@/components/journey/FirstWeekDashboardCard";
import { MonthlyDashboardCard } from "@/components/guided-rhythm/MonthlyDashboardCard";
import { WaysToConnectCard } from "@/components/connection/WaysToConnectCard";
import { ReflectionsFromRoomCard } from "@/components/connection/ReflectionsFromRoomCard";
import { DailyCompanionDashboard } from "@/components/daily-companion/DailyCompanionDashboard";
import { ContinueWhereYouLeftOff } from "@/components/daily-companion/ContinueWhereYouLeftOff";
import { FeaturedSpacesCard } from "@/components/daily-companion/FeaturedSpacesCard";
import { sortSpacesByPreference } from "@/lib/data/spaces";
import { LoadingError } from "@/components/LoadingError";
import { withTimeout } from "@/lib/utils/with-timeout";
import { ToastContainer } from "@/components/Toast";
import { useToast } from "@/lib/hooks/useToast";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";

export default function AppHome() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { toasts, showToast, removeToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [suggestedSpace, setSuggestedSpace] = useState<any>(null);
  const [recentReflections, setRecentReflections] = useState<RecentReflection[]>([]);
  const [mounted, setMounted] = useState(false);
  const [promptResponse, setPromptResponse] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);

  useEffect(() => {
    // Initialize daily companion content on first mount
    initializeDailyCompanion().catch(err => console.warn("Error initializing daily companion:", err));

    const timeoutId = setTimeout(() => {
      if (!mounted) {
        setLoadTimeout(true);
        setLoadError("Home page is taking too long to load");
      }
    }, 25000); // 25 second timeout

    const loadData = async () => {
      try {
        // CRITICAL: Load profile and spaces FIRST with timeout protection
        const [p, s] = await Promise.all([
          withTimeout(getProfile(), 8000, null),
          withTimeout(getSpaces(), 8000, [])
        ]);

        // If profile didn't load, create a minimal fallback so page can render
        const profile = p || {
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

        setProfile(profile);
        setSpaces(sortSpacesByPreference(s || []));

        // Fetch events (sync, no await needed)
        const e = getUpcomingEvents();
        setUpcomingEvents(e.slice(0, 2));

        clearTimeout(timeoutId);
        setMounted(true); // Show page NOW - don't wait for badges, reflections, offers
        setLoadError(null);
        setLoadTimeout(false);

        // SECONDARY: Load non-critical data in background (don't block page render)
        // These will update the page as they arrive
        if (p) {
          Promise.allSettled([
            getUserBadges(p.id),
            getRecentReflections(5),
            getRelevantOffers(),
            Promise.resolve(getSuggestedSpace()),
          ]).then((results) => {
            if (results[0].status === "fulfilled") setBadges(results[0].value);
            if (results[1].status === "fulfilled") setRecentReflections(results[1].value);
            if (results[2].status === "fulfilled") setOffers(results[2].value);
            if (results[3].status === "fulfilled") setSuggestedSpace(results[3].value);
          });
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setMounted(true); // Still show page even if error
      }
    };

    loadData();
  }, []);

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

  if (!mounted || !profile) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <div className="flex justify-center mb-4">
              <div className="animate-spin h-16 w-16 border-4 border-[#d4a574] border-t-transparent rounded-full" />
            </div>
            <h2 className="text-3xl text-[#2a2318] font-semibold">Getting ready for the big reveal</h2>
            <p className="text-lg text-[#6b5f52] max-w-md mx-auto">
              We're gathering your personalized experience. Just a moment...
            </p>
          </div>
          <div className="pt-8">
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#d4a574] animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-[#d4a574] animate-pulse delay-100" />
              <div className="w-2 h-2 rounded-full bg-[#d4a574] animate-pulse delay-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const todaysPrompt = getTodaysPrompt();
  const joinedSpacesCount = (profile.spacesJoined?.length ?? 0);

  return (
    <div className="space-y-8">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* v1.3 DAILY COMPANION - PRIMARY EXPERIENCE */}
      <div>
        <DailyCompanionDashboard
          displayName={profile.displayName}
          userId={profile.id}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-[#e8ddd2]" />

      {/* Continue Where You Left Off */}
      <ContinueWhereYouLeftOff
        profile={profile}
        recentReflections={recentReflections}
        upcomingEvents={upcomingEvents}
      />

      {/* Featured Spaces */}
      <FeaturedSpacesCard spaces={spaces} />

      {/* Divider */}
      <div className="border-t border-[#e8ddd2]" />

      {/* SECONDARY CONTENT - Below the fold */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-[#2a2318]">Your Community</h3>

        {/* Your Spaces - if user has joined any */}
        {joinedSpacesCount > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">All Your Spaces</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {spaces
                .filter((s) => profile?.spacesJoined?.includes(s.id) && !s.hidden)
                .map((space) => (
                  <Link key={space.id} href={`/app/spaces/${space.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-auto flex flex-col items-center gap-1 py-2 hover:bg-[#f3ede5] hover:border-[#c99563] transition-all"
                    >
                      <SpaceIconSVG spaceId={space.id} size={18} />
                      <span className="text-center text-xs font-medium line-clamp-2">{space.name}</span>
                    </Button>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* Connection and Reflection Scaffolding */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">Ways to Connect</h4>
            <WaysToConnectCard />
          </div>
          <div>
            <h4 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">From the Room</h4>
            <ReflectionsFromRoomCard recentReflections={recentReflections} />
          </div>
        </div>

        {/* Journey Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">Seven Doors Journey</h4>
            <FirstWeekDashboardCard />
          </div>
          <div>
            <h4 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">Guided Rhythm</h4>
            <MonthlyDashboardCard />
          </div>
        </div>

        {/* Events Section */}
        {upcomingEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">Upcoming Events</h4>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="bg-white">
                  <div className="space-y-2">
                    <p className="font-medium text-[#2a2318]">{event.title}</p>
                    <p className="text-sm text-[#6b5f52]">
                      {event.date ? new Date(event.date).toLocaleDateString() : "TBA"}
                      {event.time && ` at ${event.time}`}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Badges Section */}
        {badges.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">Your Badges</h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {badges.map((badge) => (
                <Card key={badge.id} className="flex flex-col items-center justify-center gap-2 p-3 text-center bg-[#f3ede5]">
                  <span className="text-2xl">{getBadgeIcon(badge.id)}</span>
                  <p className="text-xs font-semibold text-[#2a2318] line-clamp-2">{badge.name}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
