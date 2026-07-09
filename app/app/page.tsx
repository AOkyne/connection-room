"use client";

import { useRouter } from "next/navigation";
import { getProfile, type Profile } from "@/lib/data/profiles";
import { getSpaces } from "@/lib/data/spaces";
import { getRecommendedNextStep, getTodaysPrompt, getSuggestedSpace } from "@/lib/data/recommendations";
import { getUserBadges } from "@/lib/data/badges";
import { getUpcomingEvents } from "@/lib/data/events";
import { getRelevantOffers } from "@/lib/data/offers";
import { getRecentReflections, type RecentReflection } from "@/lib/data/reflections";
import { getNewestArticle, type Article } from "@/lib/data/articles";
import { initializeDailyCompanion } from "@/lib/seed/init-daily-companion";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { IconReflection, IconProgress, IconUpcoming, IconBadges, IconForYou, IconDemo } from "@/components/Icons";
import { SpaceIconSVG } from "@/components/SpaceIconSVG";
import { getBadgeImage } from "@/lib/badge-icons";
import { getOfferIcon } from "@/lib/offer-icons";
import { getIconComponent } from "@/lib/icon-lookup";
import { FirstWeekDashboardCard } from "@/components/journey/FirstWeekDashboardCard";
import { MonthlyDashboardCard } from "@/components/guided-rhythm/MonthlyDashboardCard";
import { WaysToConnectCard } from "@/components/connection/WaysToConnectCard";
import { ReflectionsFromRoomCard } from "@/components/connection/ReflectionsFromRoomCard";
import { DailyCompanionDashboard } from "@/components/daily-companion/DailyCompanionDashboard";
import { ContinueWhereYouLeftOff } from "@/components/daily-companion/ContinueWhereYouLeftOff";
import { CommunityMembersGrid } from "@/components/community/CommunityMembersGrid";
import { InvitePanel } from "@/components/invites/InvitePanel";
import { sortSpacesByPreference } from "@/lib/data/spaces";
import { LoadingError } from "@/components/LoadingError";
import { withTimeout } from "@/lib/utils/with-timeout";
import { ToastContainer } from "@/components/Toast";
import { useToast } from "@/lib/hooks/useToast";
import { waitForAuthReady } from "@/lib/supabase/auth-ready";
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
  const [newestArticle, setNewestArticle] = useState<Article | null>(null);
  const [mounted, setMounted] = useState(false);
  const [promptResponse, setPromptResponse] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [invitePanelOpen, setInvitePanelOpen] = useState(false);

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
        if (p && s) {
          // Wait for auth session to be initialized before querying protected tables
          waitForAuthReady(2000).then(() => {
            Promise.allSettled([
              withTimeout(getUserBadges(p.id, p, s), 5000, []).catch(err => {
                console.warn("Warning: Could not load badges (using fallback)", err);
                return [];
              }),
              withTimeout(getRecentReflections(5), 3000, []).catch(err => {
                console.warn("Warning: Could not load reflections (using fallback)", err);
                return [];
              }),
              Promise.resolve(getRelevantOffers(p)),
              Promise.resolve(getSuggestedSpace()),
              Promise.resolve(getNewestArticle()),
            ]).then((results) => {
              if (results[0].status === "fulfilled") {
                console.log("Badges loaded:", results[0].value);
                setBadges(results[0].value);
              } else {
                console.warn("Badge load failed:", results[0].reason);
              }
              if (results[1].status === "fulfilled") setRecentReflections(results[1].value);
              if (results[2].status === "fulfilled") setOffers(results[2].value);
              if (results[3].status === "fulfilled") setSuggestedSpace(results[3].value);
              if (results[4].status === "fulfilled") setNewestArticle(results[4].value);
            });
          }).catch(err => {
            console.warn("Auth ready check failed, loading badges anyway", err);
            // If auth ready fails, still try to load badges
            Promise.allSettled([
              withTimeout(getUserBadges(p.id, p, s), 5000, []),
              withTimeout(getRecentReflections(5), 3000, []),
              Promise.resolve(getRelevantOffers(p)),
              Promise.resolve(getSuggestedSpace()),
              Promise.resolve(getNewestArticle()),
            ]).then((results) => {
              if (results[0].status === "fulfilled") setBadges(results[0].value);
              if (results[1].status === "fulfilled") setRecentReflections(results[1].value);
              if (results[2].status === "fulfilled") setOffers(results[2].value);
              if (results[3].status === "fulfilled") setSuggestedSpace(results[3].value);
              if (results[4].status === "fulfilled") setNewestArticle(results[4].value);
            });
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

      {/* Journey Cards - moved up before Continue Where You Left Off */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#1a0f0a]">Your Journey</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">Seven Doors Journey</h4>
            <FirstWeekDashboardCard />
          </div>
          <div>
            <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">Guided Rhythm</h4>
            <MonthlyDashboardCard />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#e8ddd2]" />

      {/* Latest Article */}
      {newestArticle && (
        <>
          <div>
            <h3 className="text-lg font-semibold text-[#1a0f0a] mb-4">From My Writing</h3>
            <Card className="overflow-hidden">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#c97a2a] mb-2">
                    {new Date(newestArticle.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <h4 className="text-xl font-bold text-[#1a0f0a] mb-3">
                    {newestArticle.title}
                  </h4>
                  <p className="text-[#1a0f0a] text-sm leading-relaxed">
                    {newestArticle.excerpt}
                  </p>
                </div>
                <div className="flex gap-3">
                  <a href={newestArticle.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="primary" size="sm">
                      Read Full Article →
                    </Button>
                  </a>
                  <Link href="/app/articles">
                    <Button variant="outline" size="sm">
                      See All Articles
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>

          {/* Divider */}
          <div className="border-t border-[#e8ddd2]" />
        </>
      )}

      {/* Continue Where You Left Off */}
      <ContinueWhereYouLeftOff
        profile={profile}
        recentReflections={recentReflections}
        upcomingEvents={upcomingEvents}
      />

      {/* Divider */}
      <div className="border-t border-[#e8ddd2]" />

      {/* SECONDARY CONTENT - Below the fold */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-[#1a0f0a]">Your Community</h3>

        {/* Community Members Grid + Invite Card Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Community Members - Left Column */}
          <div>
            <CommunityMembersGrid />
          </div>

          {/* Know Someone Who Belongs Here - Right Column */}
          <Card className="flex flex-col justify-center">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-[#1a0f0a]">
                Know someone who belongs here?
              </h4>
              <p className="text-sm text-[#4A3E33]">
                Invite a friend who is looking for more honest connection, community, and real conversation.
              </p>
              <Button
                onClick={() => setInvitePanelOpen(true)}
                style={{
                  background: "linear-gradient(135deg, #D4A040 0%, #A67C2A 100%)",
                  color: "#FFFDF8",
                }}
              >
                Invite a Friend
              </Button>
            </div>
          </Card>
        </div>

        {/* Your Spaces - if user has joined any */}
        {joinedSpacesCount > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">All Your Spaces</h4>
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

        {/* Explore All Spaces Button */}
        <Link href="/app/spaces">
          <Button>
            Explore All Spaces
          </Button>
        </Link>

        {/* Connection and Reflection Scaffolding */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
          <div>
            <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">Ways to Connect</h4>
            <WaysToConnectCard />
          </div>
          <div>
            <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">From the Room</h4>
            <ReflectionsFromRoomCard recentReflections={recentReflections} />
          </div>
        </div>

        {/* Events Section */}
        {upcomingEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">Upcoming Events</h4>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="bg-white">
                  <div className="space-y-2">
                    <p className="font-medium text-[#1a0f0a]">{event.title}</p>
                    <p className="text-sm text-[#1a0f0a]">
                      {event.date ? new Date(event.date).toLocaleDateString() : "TBA"}
                      {event.time && ` at ${event.time}`}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {badges.length > 0 && (
          <div className="hidden md:block">
            <h3 className="text-lg font-bold text-[#d4a348] mb-3">🏆 Your Achievements</h3>
            <div className="grid grid-cols-4 lg:grid-cols-5 gap-0">
              {badges.map((badge) => (
                <img
                  key={badge.id}
                  src={getBadgeImage(badge.id)}
                  alt={badge.name}
                  title={`${badge.name}: ${badge.description}`}
                  className="w-48 h-48 object-contain cursor-pointer hover:scale-110 transition-transform drop-shadow -m-2"
                />
              ))}
            </div>
          </div>
        )}


      </div>

      {/* Invite Panel Modal */}
      <InvitePanel isOpen={invitePanelOpen} onClose={() => setInvitePanelOpen(false)} />
    </div>
  );
}
