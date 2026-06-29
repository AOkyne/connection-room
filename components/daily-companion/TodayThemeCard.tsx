"use client";

import { DailyContent } from "@/lib/data/daily-companion";
import { Card } from "@/components/Card";

interface TodayThemeCardProps {
  theme: DailyContent | null;
}

export function TodayThemeCard({ theme }: TodayThemeCardProps) {
  if (!theme) return null;

  return (
    <Card className="bg-gradient-to-br from-[#d4a574]/10 to-transparent border-l-4 border-[#d4a574]">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-[#8fa878] uppercase tracking-wide mb-1">
            Today's Theme
          </p>
          <h2 className="text-2xl font-semibold text-[#2a2318]">{theme.title}</h2>
        </div>
        <p className="text-sm text-[#6b5f52] leading-relaxed">
          {theme.category && (
            <span className="inline-block bg-[#f3ede5] px-2 py-1 rounded text-xs mr-2 mb-2">
              {theme.category}
            </span>
          )}
        </p>
        <p className="text-sm text-[#6b5f52] italic">
          Let this be your gentle anchor for the day. Whatever else happens, this theme is your invitation to notice something true about yourself.
        </p>
      </div>
    </Card>
  );
}
