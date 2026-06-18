"use client";

import { useRouter } from "next/navigation";
import { getProfile, type Profile } from "@/lib/data/profiles";
import { getSpaces } from "@/lib/data/spaces";
import { getRecommendedNextStep, getTodaysPrompt, getSuggestedSpace } from "@/lib/data/recommendations";
import { getUserBadges } from "@/lib/data/badges";
import { getUpcomingEvents } from "@/lib/data/events";
import { getRelevantOffers } from "@/lib/data/offers";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { IconReflection, IconProgress, IconUpcoming, IconBadges, IconForYou, IconDemo } from "@/components/Icons";
import { getBadgeIcon } from "@/lib/badge-icons";
import { getOfferIcon } from "@/lib/offer-icons";
import { getIconComponent } from "@/lib/icon-lookup";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AppHome() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setMounted(true);
    const p = getProfile();
    setProfile(p);
    const s = getSpaces();
    setSpaces(s);

    if (p) {
      const b = getUserBadges(p.id);
      setBadges(b);
      const o = getRelevantOffers(p);
      setOffers(o);
    }

    const e = getUpcomingEvents();
    setUpcomingEvents(e.slice(0, 2)); // Show first 2 events
  }, []);

  if (!mounted || !profile) {
    return <div>Loading...</div>;
  }

  const nextStep = getRecommendedNextStep(profile);
  const todaysPrompt = getTodaysPrompt();
  const suggestedSpace = getSuggestedSpace();
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

        {/* Today's Prompt */}
        <Card className="md:col-span-2">
          <CardHeader title="Today's Reflection" icon={<IconReflection size={20} />} />
          <div className="bg-[#f3ede5] rounded-lg p-4 space-y-3">
            <p className="text-[#6b5f52] italic text-lg">"{todaysPrompt}"</p>
            <Button variant="secondary" size="md">
              Respond to Prompt
            </Button>
          </div>
        </Card>

        {/* Suggested Space */}
        <Card>
          <CardHeader title="Suggested Space" icon={<>{(() => { const Icon = getIconComponent(suggestedSpace.icon); return <Icon size={20} />; })()}</>} />
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-[#2a2318]">{suggestedSpace.name}</h3>
              <p className="text-sm text-[#6b5f52] mt-1">{suggestedSpace.description}</p>
            </div>
            <Link href="/app/spaces">
              <Button variant="outline" size="sm" className="w-full">
                Explore Spaces
              </Button>
            </Link>
          </div>
        </Card>

        {/* Quick Overview */}
        <Card>
          <CardHeader title="Your Progress" icon={<IconProgress size={20} />} />
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-[#6b5f52]">Profile</span>
              <span className="text-[#8fa878]">✓ Complete</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6b5f52]">Spaces Joined</span>
              <span className={joinedSpacesCount > 0 ? "text-[#8fa878]" : "text-[#d4a574]"}>
                {joinedSpacesCount} {joinedSpacesCount === 1 ? "space" : "spaces"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6b5f52]">Quiz</span>
              <span className={hasQuizResult ? "text-[#8fa878]" : "text-[#d4a574]"}>
                {hasQuizResult ? "✓ Done" : "Pending"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6b5f52]">Member Since</span>
              <span className="text-[#a0968a]">{new Date(profile.joinedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </Card>

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
        {offers.length > 0 && (
          <Card className="md:col-span-2 bg-gradient-to-r from-[#f3ede5] to-[#fffbf7]">
            <CardHeader title="For You" icon={<>{(() => { const Icon = getOfferIcon(offers[0].id); return <Icon size={20} />; })()}</>} />
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
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader title="Navigate" icon={<IconForYou size={20} />} />
          <div className="space-y-2">
            <Link href="/app/spaces">
              <Button variant="outline" size="sm" className="w-full text-left">
                Spaces
              </Button>
            </Link>
            <Link href="/app/pairings">
              <Button variant="outline" size="sm" className="w-full text-left">
                Pairings
              </Button>
            </Link>
            <Link href="/app/journey">
              <Button variant="outline" size="sm" className="w-full text-left">
                My Journey
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Info Banner */}
      <div className="bg-[#f3ede5] border border-[#e8ddd2] rounded-lg p-4 text-sm text-[#6b5f52]">
        <p className="font-medium text-[#2a2318] mb-2 flex items-center gap-2"><IconDemo size={16} /> Demo Mode</p>
        <p>
          You're exploring in demo mode. All data is local and resets on browser refresh. In Phase
          2, we'll connect to Supabase for persistent accounts.
        </p>
      </div>
    </div>
  );
}
