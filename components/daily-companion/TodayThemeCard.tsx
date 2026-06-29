"use client";

import { DailyContent } from "@/lib/data/daily-companion";
import { getThemeExplanation } from "@/lib/theme-explanations";
import { Card } from "@/components/Card";

interface TodayThemeCardProps {
  theme: DailyContent | null;
}

export function TodayThemeCard({ theme }: TodayThemeCardProps) {
  if (!theme) return null;

  return (
    <Card className="bg-gradient-to-br from-[#d4a348]/10 to-transparent border-l-4 border-[#d4a348]">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-[#c97a2a] uppercase tracking-wide mb-1">
            Today's Theme
          </p>
          <h2 className="text-2xl font-semibold text-[#1a0f0a]">{theme.title}</h2>
        </div>
        <p className="text-sm text-[#1a0f0a] leading-relaxed">
          {theme.category && (
            <span className="inline-block bg-[#f3ede5] px-2 py-1 rounded text-xs mr-2 mb-2">
              {theme.category}
            </span>
          )}
        </p>
        <p className="text-sm text-[#1a0f0a] leading-relaxed">
          {getThemeExplanation(theme.title)}
        </p>
      </div>
    </Card>
  );
}
