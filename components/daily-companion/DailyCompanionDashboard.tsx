"use client";

import { useEffect, useState } from "react";
import { getTodaysDailyContent, getTrevorWeeklyNote, getDaysSinceLaunch } from "@/lib/data/daily-companion";
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
        <p className="text-[#6b5f52]">Loading your daily companion...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-[#2a2318]">Welcome back, {displayName}</h1>
        <p className="text-[#6b5f52]">
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

      {/* My Reflections Panel + Context Messages */}
      {userId && (
        <div className="border-t border-[#e8ddd2] pt-8 space-y-4">
          <MyReflectionsPanel userId={userId} />

          {/* Context Messages - One Row */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-[#f3ede5] text-center border-none flex items-center justify-center">
              <p className="text-xs text-[#a0968a] italic leading-relaxed">
                You haven't saved any reflections yet. Start with today's reflection above.
              </p>
            </Card>
            <Card className="bg-[#f3ede5] text-center border-none flex items-center justify-center">
              <p className="text-xs text-[#a0968a] italic leading-relaxed max-w-sm mx-auto">
                This daily companion is designed to help you return to yourself. There's no pressure to complete everything. Choose what calls to you today. Return tomorrow for something new.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
