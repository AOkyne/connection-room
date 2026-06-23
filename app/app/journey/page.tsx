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
import { getBadgeIcon } from "@/lib/badge-icons";
import { getIconComponent } from "@/lib/icon-lookup";
import { SevenDoorsOverview } from "@/components/journey/SevenDoorsOverview";
import { GuidedRhythmOverview } from "@/components/guided-rhythm/GuidedRhythmOverview";
import { ConnectionPracticeSummary } from "@/components/connection/ConnectionPracticeSummary";
import { EventReminderBanner } from "@/components/EventReminderBanner";
import Link from "next/link";

export default function JourneyPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [interestedEvents, setInterestedEvents] = useState<any[]>([]);
  const [engagementStats, setEngagementStats] = useState<{ postsShared: number; responsesReceived: number; commentsOffered: number }>({ postsShared: 0, responsesReceived: 0, commentsOffered: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Fetch profile and spaces in parallel
      const [p, s] = await Promise.all([getProfile(), getSpaces()]);
      setProfile(p);
      setSpaces(s);

      // Then fetch badges, interested events, and engagement stats based on profile
      if (p) {
        const [b, events, engagement] = await Promise.all([
          getUserBadges(p.id, p, s),
          Promise.resolve(getUserEventInterestsList(p.id)),
          getUserEngagementStats(p.id)
        ]);
        setBadges(b);
        setInterestedEvents(events);
        setEngagementStats(engagement);
      }

      setMounted(true);
    };

    loadData();
  }, []);

  if (!mounted || !profile) return <div>Loading...</div>;

  const nextStep = getRecommendedNextStep(profile);
  const joinedSpaces = spaces.filter((s) => s.isJoined);
  const hasQuizResult = profile.quizResult && profile.quizResult !== "I have not taken the quiz yet";
  const memberTypeLabel = appConfig.memberTypeOptions.find((m) => m.id === profile.memberType)?.label || profile.memberType;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl text-[#2a2318]">My Journey</h1>
        <p className="text-lg text-[#6b5f52] mt-2">
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
      />

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Profile Summary */}
        <Card>
          <CardHeader title="Who You Are" icon={<IconProfile size={20} />} />
          <div className="space-y-4">
            <div>
              <p className="text-xs text-[#a0968a] uppercase tracking-wide">Display Name</p>
              <p className="font-medium text-[#2a2318] text-lg mt-1">{profile.displayName}</p>
            </div>
            {profile.pronouns && (
              <div>
                <p className="text-xs text-[#a0968a] uppercase tracking-wide">Pronouns</p>
                <p className="font-medium text-[#2a2318]">{profile.pronouns}</p>
              </div>
            )}
            {profile.location && (
              <div>
                <p className="text-xs text-[#a0968a] uppercase tracking-wide">Location</p>
                <p className="font-medium text-[#2a2318]">{profile.location}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[#a0968a] uppercase tracking-wide">Member Type</p>
              <p className="font-medium text-[#2a2318]">{memberTypeLabel}</p>
            </div>
            <Link href="/app/profile" className="pt-2">
              <Button variant="outline" size="sm" className="w-full">
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
                  className="inline-block bg-[#e8ddd2] text-[#2a2318] px-3 py-1 rounded-full text-xs mb-1"
                >
                  {interest}
                </span>
              ))}
              {profile.interests.length > 5 && (
                <p className="text-xs text-[#a0968a] pt-2">+{profile.interests.length - 5} more</p>
              )}
            </div>
          ) : (
            <p className="text-[#a0968a] text-sm">None selected yet</p>
          )}
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader title="Upcoming Events" icon={<IconUpcoming size={20} />} />
          {interestedEvents.length > 0 ? (
            <div className="space-y-3">
              {interestedEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="p-3 bg-[#f3ede5] rounded-lg">
                  <p className="font-medium text-[#2a2318] text-sm">{event.title}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-[#6b5f52]">
                    <span>{event.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <span>•</span>
                    <span>{event.time}</span>
                    <span>•</span>
                    <span>{event.format}</span>
                  </div>
                </div>
              ))}
              {interestedEvents.length > 3 && (
                <p className="text-xs text-[#a0968a] pt-1">+{interestedEvents.length - 3} more</p>
              )}
              <Link href="/app/events" className="pt-2 block">
                <Button variant="outline" size="sm" className="w-full">
                  View All Events
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-[#a0968a] text-sm mb-3">No events marked yet</p>
              <Link href="/app/events">
                <Button variant="secondary" size="sm" className="w-full">
                  Browse Events
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Quiz Result */}
        <Card>
          <CardHeader title="Your Profile" icon={<IconProfile size={20} />} />
          {hasQuizResult ? (
            <div>
              <p className="text-lg font-medium text-[#2a2318]">{profile.quizResult}</p>
              <p className="text-sm text-[#6b5f52] mt-2">From the Connection Assessment</p>
              <Link href={appConfig.urls.quiz} className="pt-3 block">
                <Button variant="outline" size="sm" className="w-full">
                  Retake Quiz
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-[#a0968a] text-sm mb-3">Discover your connection profile</p>
              <Link href={appConfig.urls.quiz}>
                <Button variant="secondary" size="sm" className="w-full">
                  Take Quiz
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
                  <span className="text-[#2a2318]">{space.name}</span>
                </div>
              ))}
              {joinedSpaces.length > 4 && (
                <p className="text-xs text-[#a0968a] pt-1">+{joinedSpaces.length - 4} more</p>
              )}
              <Link href="/app/spaces" className="pt-2 block">
                <Button variant="outline" size="sm" className="w-full">
                  Browse All
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-[#a0968a] text-sm mb-3">Haven't joined any spaces yet</p>
              <Link href="/app/spaces">
                <Button variant="secondary" size="sm" className="w-full">
                  Join a Space
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Badges */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader title="Achievements" icon={<IconBadges size={20} />} />
          {badges.length > 0 ? (
            <div className="space-y-2">
              {badges.map((badge) => {
                const BadgeIcon = getBadgeIcon(badge.id);
                return (
                  <div key={badge.id} className="flex items-center gap-2 p-2 bg-[#f3ede5] rounded">
                    <BadgeIcon size={20} className="text-[#d4a574] flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#2a2318]">{badge.name}</p>
                      <p className="text-xs text-[#a0968a]">{badge.description}</p>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-[#a0968a] pt-2">Earn more as you explore the community</p>
            </div>
          ) : (
            <p className="text-xs text-[#a0968a]">Badges coming as you participate</p>
          )}
        </Card>

        {/* Connections */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader title="Connections" icon={<IconConnection size={20} />} />
          {profile.pairingComfortLevel && profile.pairingComfortLevel !== "pause" ? (
            <div>
              <p className="text-sm text-[#6b5f52] mb-3">You're open to pairings</p>
              <Link href="/app/connections">
                <Button variant="secondary" size="sm" className="w-full">
                  View Pairing
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[#a0968a] mb-3">Connections paused</p>
              <Link href="/app/connections">
                <Button variant="outline" size="sm" className="w-full">
                  Manage Preferences
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Recommended Next Step - Full Width */}
      {nextStep && (
        <Card className="bg-gradient-to-br from-[#f3ede5] to-[#fffbf7] border-2 border-[#d4a574]">
          <CardHeader title={nextStep.title} icon={nextStep.icon ? <>{(() => { const Icon = getIconComponent(nextStep.icon); return <Icon size={20} />; })()} </> : undefined} />
          <div className="space-y-4">
            <p className="text-[#6b5f52]">{nextStep.description}</p>
            <div className="flex gap-3">
              <Link href={nextStep.href} className="flex-1">
                <Button
                  variant={nextStep.type === "external" ? "secondary" : "primary"}
                  size="lg"
                  className="w-full"
                >
                  {nextStep.action} →
                </Button>
              </Link>
              {nextStep.type === "external" && (
                <p className="text-xs text-[#a0968a] pt-3">Opens in new tab</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Services Section */}
      <Card className="bg-[#f3ede5]">
        <CardHeader title="Explore Trevor James Services" icon={<IconIntegration size={20} />} />
        <div className="space-y-3 text-sm">
          <p className="text-[#6b5f52]">
            Deepen your practice with personalized coaching, workshops, and more.
          </p>
          <div className="space-y-2">
            <Link href={appConfig.urls.freeConsult}>
              <Button variant="secondary" size="sm" className="w-full">
                Free Consultation
              </Button>
            </Link>
            <Link href={appConfig.urls.couplesDiscoveryCall}>
              <Button variant="outline" size="sm" className="w-full">
                Couples Discovery Call
              </Button>
            </Link>
            <Link href={appConfig.urls.mainWebsite}>
              <Button variant="outline" size="sm" className="w-full">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
