"use client";

import { useEffect, useState } from "react";
import { getTodaysDailyContent, getTrevorWeeklyNote, getDaysSinceLaunch, getThemeHeroImage } from "@/lib/data/daily-companion";
import { Avatar } from "@/components/Avatar";
import { TodayThemeCard } from "./TodayThemeCard";
import { ReflectionPromptCard } from "./ReflectionPromptCard";
import { EmbodimentPracticeCard } from "./EmbodimentPracticeCard";
import { BodyCheckInCard } from "./BodyCheckInCard";
import { ConversationInvitationCard } from "./ConversationInvitationCard";
import { FeaturedQuoteCard } from "./FeaturedQuoteCard";
import { WeeklyTrevorNoteCard } from "./WeeklyTrevorNoteCard";
import { MyReflectionsPanel } from "./MyReflectionsPanel";
import { Card } from "@/components/Card";
import type { DailyContent, WeeklyNote } from "@/lib/data/daily-companion";

interface DailyCompanionDashboardProps {
  displayName: string;
  userId: string | null;
}

export function DailyCompanionDashboard({ displayName, userId }: DailyCompanionDashboardProps) {
  const [dailyContent, setDailyContent] = useState<{
    theme: DailyContent | null;
    reflection: DailyContent | null;
    practice: DailyContent | null;
    checkin: DailyContent | null;
    invitation: DailyContent | null;
    quote: DailyContent | null;
  }>({
    theme: null,
    reflection: null,
    practice: null,
    checkin: null,
    invitation: null,
    quote: null,
  });

  const [weeklyNote, setWeeklyNote] = useState<WeeklyNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [reflectionSaved, setReflectionSaved] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const [daily, weekly] = await Promise.all([getTodaysDailyContent(), getTrevorWeeklyNote()]);
        setDailyContent(daily);
        setWeeklyNote(weekly);
      } catch (error) {
        console.warn("Error loading daily companion content:", error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  const handleReflectionSaved = () => {
    setReflectionSaved(true);
    setTimeout(() => setReflectionSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#1a0f0a]">Loading your daily companion...</p>
      </div>
    );
  }

  const heroImage = getThemeHeroImage(dailyContent.theme?.category);

  return (
    <div className="space-y-8">
      {/* Hero Image */}
      <div className="h-64 overflow-hidden rounded-xl shadow-md relative">
        <img
          src={heroImage}
          alt="Today's theme"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/20" />
      </div>

      {/* Greeting */}
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <Avatar name={displayName} size="lg" />
          <h1 className="text-3xl font-semibold text-[#1a0f0a]">Welcome back, {displayName.split(' ')[0]}</h1>
        </div>
        <p className="text-[#1a0f0a]">
          {new Date().toLocaleDateString("en-US", {
            timeZone: "America/Los_Angeles",
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
          })}
        </p>
      </div>

      {/* Main Daily Content Grid */}
      <div className="space-y-6">
        {/* Theme - Full Width */}
        <TodayThemeCard theme={dailyContent.theme} />

        {/* Reflection + Invitation - Two Columns */}
        <div className="grid md:grid-cols-2 gap-6">
          <ReflectionPromptCard prompt={dailyContent.reflection} userId={userId} onSave={handleReflectionSaved} />
          <ConversationInvitationCard invitation={dailyContent.invitation} />
        </div>

        {/* Practice + Check-in - Two Columns */}
        <div className="grid md:grid-cols-2 gap-6">
          <EmbodimentPracticeCard practice={dailyContent.practice} />
          <BodyCheckInCard checkin={dailyContent.checkin} />
        </div>

        {/* Quote */}
        <FeaturedQuoteCard quote={dailyContent.quote} />
      </div>

      {/* Trevor Weekly Note */}
      {weeklyNote && (
        <div className="border-t border-[#e8ddd2] pt-8">
          <WeeklyTrevorNoteCard note={weeklyNote} />
        </div>
      )}

      {/* My Reflections Panel */}
      {userId && (
        <div className="border-t border-[#e8ddd2] pt-8">
          <MyReflectionsPanel userId={userId} />
        </div>
      )}
    </div>
  );
}
