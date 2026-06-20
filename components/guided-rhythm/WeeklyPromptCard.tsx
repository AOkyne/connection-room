"use client";

import { WeeklyPrompt } from "@/lib/types/guided-rhythm";
import { Card } from "@/components/Card";

interface WeeklyPromptCardProps {
  week: WeeklyPrompt;
  isCurrentWeek?: boolean;
}

export function WeeklyPromptCard({
  week,
  isCurrentWeek = false,
}: WeeklyPromptCardProps) {
  return (
    <Card
      className={`${
        isCurrentWeek
          ? "ring-2 ring-[#d4a574] bg-white"
          : "bg-[#f8f6f2]"
      }`}
    >
      <div className="space-y-4">
        {/* Week Header */}
        <div className="flex items-baseline gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#f3ede5]">
            <span className="text-[#d4a574] font-bold">W{week.weekNumber}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#2a2318]">
              {week.title}
            </h3>
            {isCurrentWeek && (
              <p className="text-xs text-[#8fa878] font-medium uppercase tracking-wide mt-1">
                This Week
              </p>
            )}
          </div>
        </div>

        {/* Dashboard Prompt */}
        <div className="bg-gradient-to-r from-[#f3ede5] to-white rounded-lg p-4 border-l-4 border-[#d4a574]">
          <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide mb-2">
            Today's Invitation
          </p>
          <p className="text-sm text-[#6b5f52] leading-relaxed italic">
            {week.dashboardPrompt}
          </p>
        </div>

        {/* Private Reflection */}
        <div>
          <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide mb-2">
            Private Reflection
          </p>
          <p className="text-sm text-[#6b5f52] leading-relaxed">
            {week.privateReflection}
          </p>
        </div>

        {/* Community Invitation */}
        <div className="bg-[#f3ede5] rounded-lg p-4">
          <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide mb-2">
            If You Want to Share
          </p>
          <p className="text-sm text-[#6b5f52] leading-relaxed">
            {week.communityInvitation}
          </p>
        </div>

        {/* Pairing Prompt */}
        <div>
          <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide mb-2">
            For Connection Pairings
          </p>
          <p className="text-sm text-[#6b5f52] leading-relaxed">
            {week.pairingPrompt}
          </p>
        </div>

        {/* Microcopy */}
        <div className="pt-3 border-t border-[#e8ddd2]">
          <p className="text-xs text-[#a0968a] italic">
            Use what speaks to you. Leave what does not. A small honest
            reflection is enough.
          </p>
        </div>
      </div>
    </Card>
  );
}
