"use client";

import { useRouter } from "next/navigation";
import { getProfile, type Profile } from "@/lib/data/profiles";
import { getSpaces } from "@/lib/data/spaces";
import { getRecommendedNextStep, getTodaysPrompt, getSuggestedSpace } from "@/lib/data/recommendations";
import { getUserBadges } from "@/lib/data/badges";
import { getUpcomingEvents } from "@/lib/data/events";
import { getRelevantOffers } from "@/lib/data/offers";
import { getRecentReflections, type RecentReflection } from "@/lib/data/reflections";
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
import { sortSpacesByPreference } from "@/lib/data/spaces";
import { LoadingError } from "@/components/LoadingError";
import { withTimeout } from "@/lib/utils/with-timeout";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { createPost } from "@/lib/data/posts";

export default function AppHome() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
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
          Promise.all([
            getUserBadges(p.id).catch(err => {
              console.warn("Warning: Could not load badges (using fallback)");
              return [];
            }),
            getRecentReflections(5).catch(err => {
              console.warn("Warning: Could not load reflections (using fallback)");
              return [];
            }),
          ]).then(([b, reflections]) => {
            setBadges(b || []);
            setRecentReflections(reflections || []);
          }).catch(err => {
            console.warn("Warning: Error loading badges/reflections");
            setBadges([]);
            setRecentReflections([]);
          });

          // Fetch synchronous data
          try {
            const suggested = getSuggestedSpace();
            setSuggestedSpace(suggested || null);
          } catch (err) {
            console.warn("Warning: Could not get suggested space (using fallback)");
          }

          // Fetch offers (sync)
          try {
            const o = getRelevantOffers(p);
            setOffers(o || []);
          } catch (err) {
            console.warn("Warning: Could not load offers (using fallback)");
            setOffers([]);
          }
        }
      } catch (error) {
        console.error("Error loading home page:", error);
        setLoadError("Unable to load your home page. Please try again.");
        clearTimeout(timeoutId);
      }
    };

    loadData();

    return () => clearTimeout(timeoutId);
  }, []);

  if (loadTimeout && !mounted) {
    return (
      <LoadingError
        message="Home page is taking too long to load"
        onRetry={() => {
          setLoadError(null);
          setLoadTimeout(false);
          setMounted(false);
          window.location.reload();
        }}
      />
    );
  }

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

  const nextStep = getRecommendedNextStep(profile);
  const todaysPrompt = getTodaysPrompt();
  const joinedSpacesCount = (profile.spacesJoined?.length ?? 0);
  const hasQuizResult = profile.quizResult && profile.quizResult !== "I have not taken the quiz yet";

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-4xl text-[#2a2318]">Welcome, {profile.displayName}</h1>
        <p className="text-lg text-[#6b5f52]">
          You're part of a community dedicated to honest connection and embodied intimacy.
        </p>
      </div>

      {/* Main Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Your Spaces or Choose First Space */}
        {joinedSpacesCount > 0 ? (
          <Card className="md:col-span-2 bg-gradient-to-br from-[#f3ede5] to-[#fffbf7]">
            <CardHeader title="Your Spaces" icon="🏛️" />
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {spaces
                .filter((s) => profile?.spacesJoined?.includes(s.id))
                .map((space) => (
                  <Link key={space.id} href={`/app/spaces/${space.id}`}>
                    <Button variant="outline" size="sm" className="w-full h-auto flex flex-col items-center gap-1 py-2 hover:bg-[#f3ede5] hover:border-[#c99563] transition-all">
                      <SpaceIconSVG spaceId={space.id} size={20} />
                      <h3 className="text-center text-xs">{space.name}</h3>
                    </Button>
                  </Link>
                ))}
            </div>
          </Card>
        ) : (
          <>
            {/* Recommended Next Step - Featured */}
            {nextStep && (
              <Card className="md:col-span-2 bg-gradient-to-br from-[#f3ede5] to-[#fffbf7] border-[#d4a574]">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl text-[#2a2318]">{nextStep.title}</h2>
                      <p className="text-[#6b5f52] mt-1">{nextStep.description}</p>
                    </div>
                    {nextStep.icon && (() => {
                      const Icon = getIconComponent(nextStep.icon);
                      return <Icon size={32} className="text-[#d4a574]" />;
                    })()}
                  </div>
                  <Link href={nextStep.href}>
                    <Button
                      variant={nextStep.type === "external" ? "secondary" : "primary"}
                      size="lg"
                      className="w-full sm:w-auto"
                    >
                      {nextStep.action} →
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Today's Prompt */}
        <Card id="todays-reflection" className="md:col-span-2">
          <CardHeader title="Today's Reflection" icon={<IconReflection size={20} />} />
          <div className="bg-[#f3ede5] rounded-lg p-4 space-y-3">
            <p className="text-[#6b5f52] italic text-lg">"{todaysPrompt}"</p>
            <p className="text-sm text-[#8fa878]">A sentence or two is enough. No need to write a memoir unless the memoir insists.</p>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setPromptResponse("");
                const commonsSpace = spaces.find(s => s.id === "commons");
                setSelectedSpaceId(commonsSpace?.id || spaces[0]?.id || "");
                dialogRef.current?.showModal();
              }}
            >
              Respond to Prompt
            </Button>
          </div>
        </Card>

        {/* Connection Scaffolding Cards */}
        <WaysToConnectCard />
        <ReflectionsFromRoomCard recentReflections={recentReflections} />

        {/* First Week Journey or Guided Rhythm */}
        <FirstWeekDashboardCard />
        <MonthlyDashboardCard />


        {/* Upcoming Event */}
        {upcomingEvents.length > 0 && (
          <Card>
            <CardHeader title="Upcoming" icon={<IconUpcoming size={20} />} />
            <div className="space-y-3">
              <div>
                <p className="font-medium text-[#2a2318]">{upcomingEvents[0].title}</p>
                <p className="text-sm text-[#6b5f52]">
                  {upcomingEvents[0].date.toLocaleDateString()} at {upcomingEvents[0].time}
                </p>
              </div>
              <Link href="/app/events">
                <Button variant="outline" size="sm" className="w-full">
                  View All Events
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Take A Quiz */}
        <Card>
          <CardHeader title="Take A Quiz" icon={<>{(() => { const Icon = getIconComponent("🧭"); return <Icon size={20} />; })()}</>} />
          <div className="space-y-3">
            <Link href="/app/quizzes">
              <Button variant="primary" size="sm" className="w-full text-left">
                Take A Quiz →
              </Button>
            </Link>
            <p className="text-sm text-[#6b5f52]">
              Discover your intimacy patterns and relationship dynamics with our curated quizzes.
            </p>
          </div>
        </Card>

        {/* Badges */}
        {badges.length > 0 && (
          <Card>
            <CardHeader title="Badges Earned" icon={<IconBadges size={20} />} />
            <div className="space-y-2">
              {badges.slice(0, 2).map((badge) => {
                const BadgeIcon = getBadgeIcon(badge.id);
                return (
                  <div key={badge.id} className="flex items-center gap-2 p-2 bg-[#f3ede5] rounded">
                    <BadgeIcon size={20} className="text-[#d4a574] flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-[#2a2318]">{badge.name}</p>
                      <p className="text-xs text-[#a0968a]">{badge.description}</p>
                    </div>
                  </div>
                );
              })}
              {badges.length > 2 && (
                <p className="text-xs text-[#a0968a] pt-2">{badges.length - 2} more badges →</p>
              )}
            </div>
          </Card>
        )}

        {/* Personalized Offers */}
        {offers.length > 0 && (() => {
          const OfferIcon = getOfferIcon(offers[0].id);
          return (
            <Card className="md:col-span-2 bg-gradient-to-r from-[#f3ede5] to-[#fffbf7]">
              <CardHeader title="For You" icon={<OfferIcon size={20} />} />
              <div className="space-y-3">
                {offers.slice(0, 1).map((offer) => (
                  <div key={offer.id}>
                    <p className="font-medium text-[#2a2318]">{offer.title}</p>
                    <p className="text-sm text-[#6b5f52] mt-1">{offer.description}</p>
                    <a href={offer.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="primary" size="sm" className="mt-3">
                        {offer.cta} →
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

      </div>

      {/* Info Banner */}
      <div className="bg-[#f3ede5] border border-[#e8ddd2] rounded-lg p-4 text-sm text-[#6b5f52]">
        <p className="font-medium text-[#2a2318] mb-2 flex items-center gap-2"><IconDemo size={16} /> Demo Mode</p>
        <p>
          You're exploring in demo mode. All data is local and resets on browser refresh. In Phase
          2, we'll connect to Supabase for persistent accounts.
        </p>
      </div>

      {/* Prompt Response Modal */}
      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 rounded-xl shadow-xl p-6 border border-[#e8ddd2] w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-[#2a2318]">Respond to Prompt</h2>
          <button
            onClick={() => dialogRef.current?.close()}
            className="text-[#a0968a] hover:text-[#6b5f52] text-2xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="bg-[#f3ede5] rounded-lg p-4">
            <p className="text-[#6b5f52] italic">"{todaysPrompt}"</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#2a2318]">
              Your Response
            </label>
            <textarea
              value={promptResponse}
              onChange={(e) => setPromptResponse(e.target.value)}
              placeholder="Share your thoughts..."
              className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a574] text-[#2a2318] bg-white"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#2a2318]">
              Share in Space
            </label>
            <select
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
              className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a574] text-[#2a2318] bg-white"
            >
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="flex-1 font-medium rounded-lg transition-all duration-150 focus:outline-none border-2 border-[#d4a574] text-[#9d7f5c] hover:bg-[#faf7f2] px-4 py-2 text-base"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!promptResponse.trim() || !selectedSpaceId) return;
                setSubmitting(true);
                try {
                  await createPost(
                    selectedSpaceId,
                    profile.displayName,
                    promptResponse,
                    true,
                    undefined,
                    profile.pronouns,
                    profile.profilePhoto
                  );
                  setPromptResponse("");
                  dialogRef.current?.close();
                } catch (error) {
                  console.error("Error creating post:", error);
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={submitting || !promptResponse.trim() || !selectedSpaceId}
              className="flex-1 font-medium rounded-lg transition-all duration-150 focus:outline-none bg-[#9d7f5c] text-white hover:bg-[#7d6245] active:bg-[#6a523a] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-base"
            >
              {submitting ? "Posting..." : "Post Response"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
