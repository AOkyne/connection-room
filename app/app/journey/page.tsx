"use client";

import { useEffect, useState } from "react";
import { getProfile, type Profile } from "@/lib/data/profiles";
import { getSpaces } from "@/lib/data/spaces";
import { getUserBadges } from "@/lib/data/badges";
import { getRecommendedNextStep, getTodaysPrompt } from "@/lib/data/recommendations";
import { getUserEventInterestsList } from "@/lib/data/events";
import { getUserEngagementStats } from "@/lib/data/posts";
import { appConfig } from "@/lib/config";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { IconIntegration, IconSpaces, IconConnection, IconProfileNav, IconBadges, IconProfile, IconUpcoming } from "@/components/Icons";
import { SpaceIconSVG } from "@/components/SpaceIconSVG";
import { getBadgeImage } from "@/lib/badge-icons";
import { getIconComponent } from "@/lib/icon-lookup";
import { SevenDoorsOverview } from "@/components/journey/SevenDoorsOverview";
import { GuidedRhythmOverview } from "@/components/guided-rhythm/GuidedRhythmOverview";
import { ConnectionPracticeSummary } from "@/components/connection/ConnectionPracticeSummary";
import { EventReminderBanner } from "@/components/EventReminderBanner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { LoadingError } from "@/components/LoadingError";
import { SkeletonCard, SkeletonGrid } from "@/components/Skeleton";
import { Breadcrumb } from "@/components/Breadcrumb";
import { withTimeout } from "@/lib/utils/with-timeout";
import Link from "next/link";
import Image from "next/image";

export default function JourneyPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [interestedEvents, setInterestedEvents] = useState<any[]>([]);
  const [engagementStats, setEngagementStats] = useState<{ postsShared: number; responsesReceived: number; commentsOffered: number }>({ postsShared: 0, responsesReceived: 0, commentsOffered: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!mounted) {
        setLoadTimeout(true);
        setLoadError("Journey page is taking too long to load");
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
        setSpaces(s || []);
        setMounted(true); // Show page NOW - don't wait for badges, events, engagement

        clearTimeout(timeoutId);
        setLoadError(null);
        setLoadTimeout(false);

        // SECONDARY: Load non-critical data in background (don't block page render)
        if (p) {
          Promise.all([
            getUserBadges(p.id, p, s).catch(err => {
              console.warn("Warning: Could not load badges (using fallback)");
              return [];
            }),
            Promise.resolve(getUserEventInterestsList(p.id)).catch(err => {
              console.warn("Warning: Could not load events (using fallback)");
              return [];
            }),
            getUserEngagementStats(p.id).catch(err => {
              console.warn("Warning: Could not load engagement stats (using fallback)");
              return { postsShared: 0, responsesReceived: 0, commentsOffered: 0 };
            })
          ]).then(([b, events, engagement]) => {
            setBadges(b || []);
            setInterestedEvents(events || []);
            setEngagementStats(engagement || { postsShared: 0, responsesReceived: 0, commentsOffered: 0 });
            setStatsLoading(false); // Stats loaded - show real data instead of skeleton
          }).catch(err => {
            console.warn("Warning: Error loading profile-dependent data (using fallbacks)");
            setBadges([]);
            setInterestedEvents([]);
            setEngagementStats({ postsShared: 0, responsesReceived: 0, commentsOffered: 0 });
            setStatsLoading(false); // Even on error, stop showing skeleton
          });
        }
      } catch (err) {
        console.error("Error loading journey page:", err);
        setLoadError("Unable to load your journey. Please try again.");
        clearTimeout(timeoutId);
      }
    };

    loadData();

    return () => clearTimeout(timeoutId);
  }, []);

  if (loadTimeout && !mounted) {
    return (
      <LoadingError
        message="Journey page is taking too long to load"
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
    return <LoadingScreen message="Getting ready for your journey" subtitle="We're gathering your personalized experience. Just a moment..." />;
  }

  const nextStep = getRecommendedNextStep(profile);
  const joinedSpaces = spaces.filter((s) => s.isJoined);
  const hasQuizResult = profile.quizResult && profile.quizResult !== "I have not taken the quiz yet";
  const memberTypeLabel = appConfig.memberTypeOptions.find((m) => m.id === profile.memberType)?.label || profile.memberType;

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: "Home", href: "/app" },
          { label: "My Journey", isActive: true },
        ]}
      />

      {/* Hero Image */}
      <div className="relative w-full h-64 -mx-6 overflow-hidden rounded-b-2xl">
        <Image
          src="/imagery/image8.png"
          alt="Your Journey"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/15"></div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-4xl text-[#1a0f0a]">My Journey</h1>
        <p className="text-lg text-[#1a0f0a] mt-2">
          Your guided path through the community
        </p>
      </div>

      {/* Event Reminders */}
      <EventReminderBanner />

      {/* Seven Doors of Connection */}
      <SevenDoorsOverview />

      {/* Guided Rhythm */}
      <GuidedRhythmOverview />

      {/* Your Connection Practice */}
      <ConnectionPracticeSummary
        postCount={engagementStats.postsShared}
        commentCount={engagementStats.responsesReceived}
        commentsOffered={engagementStats.commentsOffered}
        spacesJoinedCount={joinedSpaces.length}
        statsLoading={statsLoading}
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Profile Summary */}
        <Card>
          <CardHeader title="Who You Are" icon={<IconProfile size={20} />} />
          <div className="space-y-4">
            <div>
              <p className="text-xs text-[#a0704a] uppercase tracking-wide">Display Name</p>
              <p className="font-medium text-[#1a0f0a] text-lg mt-1">{profile.displayName}</p>
            </div>
            {profile.pronouns && (
              <div>
                <p className="text-xs text-[#a0704a] uppercase tracking-wide">Pronouns</p>
                <p className="font-medium text-[#1a0f0a]">{profile.pronouns}</p>
              </div>
            )}
            {profile.location && (
              <div>
                <p className="text-xs text-[#a0704a] uppercase tracking-wide">Location</p>
                <p className="font-medium text-[#1a0f0a]">{profile.location}</p>
                </div>
            )}
            <div>
              <p className="text-xs text-[#a0704a] uppercase tracking-wide">Member Type</p>
              <p className="font-medium text-[#1a0f0a]">{memberTypeLabel}</p>
            </div>
            <Link href="/app/profile" className="pt-2">
              <Button variant="outline" size="sm" className="">
                Edit Profile
              </Button>
            </Link>
          </div>
        </Card>

        {/* Interests */}
        <Card>
          <CardHeader title="Your Interests" icon={<IconIntegration size={20} />} />
          {profile.interests && profile.interests.length > 0 ? (
            <div className="space-y-2">
              {profile.interests.slice(0, 5).map((interest: string) => (
                <span
                  key={interest}
                  className="inline-block bg-[#e8ddd2] text-[#1a0f0a] px-3 py-1 rounded-full text-xs mb-1"
                >
                  {interest}
                </span>
              ))}
              {profile.interests.length > 5 && (
                <p className="text-xs text-[#a0704a] pt-2">+{profile.interests.length - 5} more</p>
              )}
            </div>
          ) : (
            <p className="text-[#a0704a] text-sm">None selected yet</p>
          )}
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader title="Upcoming Events" icon={<IconUpcoming size={20} />} />
          {interestedEvents.length > 0 ? (
            <div className="space-y-3">
              {interestedEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="p-3 bg-[#f3ede5] rounded-lg">
                  <p className="font-medium text-[#1a0f0a] text-sm">{event.title}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-[#1a0f0a]">
                    <span>{event.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <span>•</span>
                    <span>{event.time}</span>
                    <span>•</span>
                    <span>{event.format}</span>
                  </div>
                </div>
              ))}
              {interestedEvents.length > 3 && (
                <p className="text-xs text-[#a0704a] pt-1">+{interestedEvents.length - 3} more</p>
              )}
              <Link href="/app/events" className="pt-2 block">
                <Button variant="outline" size="sm" className="">
                  View All Events
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-[#a0704a] text-sm mb-3">No events marked yet</p>
              <Link href="/app/events">
                <Button variant="secondary" size="sm" className="">
                  Browse Events
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Know Yourself Better - Quiz Card */}
        <Card>
          <CardHeader title="Know Yourself Better" icon={<IconProfile size={20} />} />
          {hasQuizResult ? (
            <div className="space-y-3">
              <div className="bg-[#f3ede5] rounded-lg p-3 border-l-4 border-[#c97a2a]">
                <p className="text-xs text-[#c97a2a] font-medium uppercase tracking-wide mb-1">Your Pattern</p>
                <p className="text-lg font-semibold text-[#1a0f0a]">{profile.quizResult}</p>
              </div>
              <p className="text-sm text-[#1a0f0a] leading-relaxed">
                This insight shows how you tend to relate and connect. Understanding your pattern helps you navigate relationships with more awareness and authenticity.
              </p>
              <div className="flex gap-2 pt-1">
                <Link href="/app/quizzes" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    Retake Quiz
                  </Button>
                </Link>
                <Link href="/app/quizzes" className="flex-1">
                  <Button variant="ghost" size="sm" className="w-full">
                    Other Quizzes
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[#1a0f0a] text-sm">Choose from our curated quizzes to discover your unique connection patterns and get personalized insights.</p>
              <Link href="/app/quizzes">
                <Button variant="primary" size="sm" className="w-full">
                  Explore Quizzes →
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Spaces */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader title="Communities" icon={<IconSpaces size={20} />} />
          {joinedSpaces.length > 0 ? (
            <div className="space-y-2">
              {joinedSpaces.slice(0, 4).map((space) => (
                <div key={space.id} className="text-sm p-2 bg-[#f3ede5] rounded flex items-center gap-2">
                  <SpaceIconSVG spaceId={space.id} size={16} />
                  <span className="text-[#1a0f0a]">{space.name}</span>
                </div>
              ))}
              {joinedSpaces.length > 4 && (
                <p className="text-xs text-[#a0704a] pt-1">+{joinedSpaces.length - 4} more</p>
              )}
              <Link href="/app/spaces" className="pt-2 block">
                <Button variant="outline" size="sm" className="">
                  Browse All
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-[#a0704a] text-sm mb-3">Haven't joined any spaces yet</p>
              <Link href="/app/spaces">
                <Button variant="secondary" size="sm" className="">
                  Join a Space
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Badges Section */}
        {badges.length > 0 && (
          <div className="md:col-span-3">
            <h3 className="text-lg font-bold text-[#d4a348] mb-4">🏆 Your Achievements</h3>
            <div className="grid grid-cols-4 lg:grid-cols-5 gap-1">
              {badges.map((badge) => (
                <img
                  key={badge.id}
                  src={getBadgeImage(badge.id)}
                  alt={badge.name}
                  title={`${badge.name}: ${badge.description}`}
                  className="w-48 h-48 object-contain cursor-pointer hover:scale-110 transition-transform drop-shadow"
                />
              ))}
            </div>
          </div>
        )}

        {/* Connections */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader title="Connections" icon={<IconConnection size={20} />} />
          {profile.connectionComfortLevel && profile.connectionComfortLevel !== "pause" ? (
            <div>
              <p className="text-sm text-[#1a0f0a] mb-3">You're open to connections</p>
              <Link href="/app/connections">
                <Button variant="secondary" size="sm" className="">
                  View Connection
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[#a0704a] mb-3">Connections paused</p>
              <Link href="/app/connections">
                <Button variant="outline" size="sm" className="">
                  Manage Preferences
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Recommended Next Step - Full Width */}
      {nextStep && (
        <Card className="bg-gradient-to-br from-[#f3ede5] to-[#fffbf7] border-2 border-[#d4a348]">
          <CardHeader title={nextStep.title} icon={nextStep.icon ? <>{(() => { const Icon = getIconComponent(nextStep.icon); return <Icon size={20} />; })()} </> : undefined} />
          <div className="space-y-4">
            <p className="text-[#1a0f0a]">{nextStep.description}</p>
            <div className="flex gap-3">
              <Link href={nextStep.href} className="flex-1">
                <Button
                  variant={nextStep.type === "external" ? "secondary" : "primary"}
                  size="lg"
                  className=""
                >
                  {nextStep.action} →
                </Button>
              </Link>
              {nextStep.type === "external" && (
                <p className="text-xs text-[#a0704a] pt-3">Opens in new tab</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Services Section */}
      <Card className="bg-[#f3ede5]">
        <CardHeader title="Explore Trevor James Services" icon={<IconIntegration size={20} />} />
        <div className="space-y-3 text-sm">
          <p className="text-[#1a0f0a]">
            Deepen your practice with personalized coaching, workshops, and more.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={appConfig.urls.freeConsult}>
              <Button variant="secondary" size="sm">
                Free Consultation
              </Button>
            </Link>
            <Link href={appConfig.urls.couplesDiscoveryCall}>
              <Button variant="outline" size="sm">
                Couples Discovery Call
              </Button>
            </Link>
            <Link href={appConfig.urls.mainWebsite}>
              <Button variant="outline" size="sm">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
