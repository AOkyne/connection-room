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
import { ToastContainer } from "@/components/Toast";
import { useToast } from "@/lib/hooks/useToast";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { createPost } from "@/lib/data/posts";

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

  // Determine primary action based on user state
  const getPrimaryAction = () => {
    if (joinedSpacesCount === 0) {
      return {
        title: "Your Next Step",
        description: "Join a space to connect with others in The Connection Room",
        action: "Explore Spaces",
        href: "/app/spaces",
        icon: "🏛️",
      };
    }
    if (nextStep) {
      return {
        title: nextStep.title,
        description: nextStep.description,
        action: nextStep.action,
        href: nextStep.href,
        icon: nextStep.icon,
      };
    }
    return {
      title: "Share a Reflection",
      description: "Start with today's prompt to connect more deeply",
      action: "Respond",
      href: "#",
      onClick: true,
      icon: "💭",
    };
  };

  const primaryAction = getPrimaryAction();

  return (
    <div className="space-y-8">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Hero Image */}
      <div className="relative w-full h-80 -mx-6 -mt-6 overflow-hidden rounded-b-2xl">
        <Image
          src="/imagery/image9.png"
          alt="Community"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/15"></div>
      </div>

      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-4xl text-[#2a2318]">Welcome, {profile.displayName}</h1>
        <p className="text-base text-[#6b5f52]">
          You're part of a community dedicated to honest connection and embodied intimacy.
        </p>
      </div>

      {/* PRIMARY: Your Next Step - Prominent Section */}
      <div className="mb-8">
        {primaryAction.onClick ? (
          <button
            onClick={() => {
              setPromptResponse("");
              const commonsSpace = spaces.find(s => s.id === "commons");
              setSelectedSpaceId(commonsSpace?.id || spaces[0]?.id || "");
              dialogRef.current?.showModal();
            }}
            className="w-full text-left"
          >
            <Card className="bg-gradient-to-br from-[#f3ede5] to-[#fffbf7] border-[#d4a574] hover:border-[#c99563] transition-colors hover:shadow-md cursor-pointer h-full">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-[#2a2318]">{primaryAction.title}</h2>
                  <p className="text-[#6b5f52] mt-2">{primaryAction.description}</p>
                  <div className="mt-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#9d7f5c] text-white rounded-lg font-medium hover:bg-[#7d6245] transition-colors">
                      {primaryAction.action} →
                    </div>
                  </div>
                </div>
                {primaryAction.icon && (() => {
                  const Icon = getIconComponent(primaryAction.icon);
                  return <Icon size={40} className="text-[#d4a574] flex-shrink-0" />;
                })()}
              </div>
            </Card>
          </button>
        ) : (
          <Link href={primaryAction.href} className="w-full">
            <Card className="bg-gradient-to-br from-[#f3ede5] to-[#fffbf7] border-[#d4a574] hover:border-[#c99563] transition-colors hover:shadow-md cursor-pointer h-full">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-[#2a2318]">{primaryAction.title}</h2>
                  <p className="text-[#6b5f52] mt-2">{primaryAction.description}</p>
                  <div className="mt-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#9d7f5c] text-white rounded-lg font-medium hover:bg-[#7d6245] transition-colors">
                      {primaryAction.action} →
                    </div>
                  </div>
                </div>
                {primaryAction.icon && (() => {
                  const Icon = getIconComponent(primaryAction.icon);
                  return <Icon size={40} className="text-[#d4a574] flex-shrink-0" />;
                })()}
              </div>
            </Card>
          </Link>
        )}
      </div>

      {/* Visual divider */}
      <div className="border-t border-[#e8ddd2]" />

      {/* SECONDARY: Supporting Cards - Lower Visual Weight */}
      <div className="space-y-6">
        {/* Your Spaces - if user has joined any */}
        {joinedSpacesCount > 0 && (
          <div>
            <h3 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">Your Spaces</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {spaces
                .filter((s) => profile?.spacesJoined?.includes(s.id))
                .map((space) => (
                  <Link key={space.id} href={`/app/spaces/${space.id}`}>
                    <Button variant="outline" size="sm" className="w-full h-auto flex flex-col items-center gap-1 py-2 hover:bg-[#f3ede5] hover:border-[#c99563] transition-all shadow-sm hover:shadow-md">
                      <SpaceIconSVG spaceId={space.id} size={20} />
                      <h3 className="text-center text-xs font-medium">{space.name}</h3>
                    </Button>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* Today's Reflection */}
        <div id="todays-reflection">
          <h3 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">Today's Reflection</h3>
          <Card className="bg-[#fffbf7] border-[#e8ddd2]">
            <div className="space-y-3">
              <p className="text-[#6b5f52] italic text-base">"{todaysPrompt}"</p>
              <p className="text-xs text-[#a0968a]">A sentence or two is enough.</p>
              <button
                onClick={() => {
                  setPromptResponse("");
                  const commonsSpace = spaces.find(s => s.id === "commons");
                  setSelectedSpaceId(commonsSpace?.id || spaces[0]?.id || "");
                  dialogRef.current?.showModal();
                }}
                className="text-sm font-medium text-[#9d7f5c] hover:text-[#7d6245] transition-colors inline-flex items-center gap-1"
              >
                Respond →
              </button>
            </div>
          </Card>
        </div>

        {/* Connection and Reflection Scaffolding */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">Connections</h3>
            <WaysToConnectCard />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">From the Room</h3>
            <ReflectionsFromRoomCard recentReflections={recentReflections} />
          </div>
        </div>

        {/* Journey Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">Your Journey</h3>
            <FirstWeekDashboardCard />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">Guided Path</h3>
            <MonthlyDashboardCard />
          </div>
        </div>

        {/* Event + Quiz + Badges + Offers - Minimal Cards - 2 column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upcoming Event */}
          {upcomingEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">Upcoming</h3>
              <Card className="bg-[#fffbf7] border-[#e8ddd2]">
                <div className="space-y-2">
                  <p className="font-medium text-[#2a2318] text-sm">{upcomingEvents[0].title}</p>
                  <p className="text-xs text-[#a0968a]">
                    {upcomingEvents[0].date.toLocaleDateString()} at {upcomingEvents[0].time}
                  </p>
                  <Link href="/app/events">
                    <button className="text-sm font-medium text-[#9d7f5c] hover:text-[#7d6245] transition-colors">
                      All Events →
                    </button>
                  </Link>
                </div>
              </Card>
            </div>
          )}

          {/* Take A Quiz or Show Result */}
          <div>
            <h3 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">Discover</h3>
            {profile?.quizResult && profile.quizResult !== "I have not taken the quiz yet" ? (
              <Card className="bg-gradient-to-br from-[#f3ede5] to-[#fffbf7] border-[#8fa878]">
                <div className="space-y-2">
                  <p className="text-xs text-[#8fa878] font-medium uppercase tracking-wide">Your Connection Profile</p>
                  <p className="text-sm font-semibold text-[#2a2318]">{profile.quizResult}</p>
                  <p className="text-xs text-[#6b5f52]">This reveals how you tend to connect with others.</p>
                  <div className="flex gap-2 pt-1">
                    <Link href="/app/journey">
                      <button className="text-sm font-medium text-[#9d7f5c] hover:text-[#7d6245] transition-colors">
                        View Details →
                      </button>
                    </Link>
                    <Link href="/app/quizzes">
                      <button className="text-sm font-medium text-[#a0968a] hover:text-[#6b5f52] transition-colors">
                        Retake
                      </button>
                    </Link>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="bg-[#fffbf7] border-[#e8ddd2]">
                <div className="space-y-2">
                  <p className="text-xs text-[#6b5f52]">Learn about your intimacy patterns with our curated quizzes.</p>
                  <Link href="/app/quizzes">
                    <button className="text-sm font-medium text-[#9d7f5c] hover:text-[#7d6245] transition-colors">
                      Take a Quiz →
                    </button>
                  </Link>
                </div>
              </Card>
            )}
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">Achievements</h3>
              <Card className="bg-[#fffbf7] border-[#e8ddd2]">
                <div className="space-y-2">
                  {badges.slice(0, 1).map((badge) => {
                    const BadgeIcon = getBadgeIcon(badge.id);
                    return (
                      <div key={badge.id} className="flex items-start gap-2">
                        <BadgeIcon size={16} className="text-[#d4a574] flex-shrink-0 mt-1" />
                        <div className="text-xs">
                          <p className="font-medium text-[#2a2318]">{badge.name}</p>
                          <p className="text-[#a0968a]">{badge.description}</p>
                        </div>
                      </div>
                    );
                  })}
                  {badges.length > 1 && (
                    <p className="text-xs text-[#a0968a] pt-1">{badges.length - 1} more →</p>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Personalized Offers */}
          {offers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[#8fa878] mb-3 uppercase tracking-wide">For You</h3>
              <Card className="bg-[#fffbf7] border-[#e8ddd2]">
                <div className="space-y-2">
                  {offers.slice(0, 1).map((offer) => (
                    <div key={offer.id} className="space-y-2">
                      <p className="font-medium text-[#2a2318] text-sm">{offer.title}</p>
                      <p className="text-xs text-[#a0968a]">{offer.description}</p>
                      <a href={offer.url} target="_blank" rel="noopener noreferrer">
                        <button className="text-sm font-medium text-[#9d7f5c] hover:text-[#7d6245] transition-colors">
                          {offer.cta} →
                        </button>
                      </a>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
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
            <p className="text-xs text-[#8fa878]">A sentence or two is enough.</p>
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
            <p className="text-xs text-[#8fa878]">Everyone in this space will see your response and can reply.</p>
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
                  const responseText = promptResponse.trim();
                  const selectedSpace = spaces.find(s => s.id === selectedSpaceId);

                  await createPost(
                    selectedSpaceId,
                    profile.displayName,
                    responseText,
                    true,
                    undefined,
                    profile.pronouns,
                    profile.profilePhoto
                  );

                  setPromptResponse("");
                  dialogRef.current?.close();

                  // Success feedback with context
                  const preview = responseText.length > 50 ? responseText.substring(0, 47) + "..." : responseText;
                  showToast(
                    `Reflection shared in ${selectedSpace?.name || "space"}! Others can now see and respond.`,
                    "success",
                    4000
                  );
                } catch (error) {
                  console.error("Error creating post:", error);
                  showToast(
                    "Failed to share your reflection. Please try again.",
                    "error",
                    4000
                  );
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
