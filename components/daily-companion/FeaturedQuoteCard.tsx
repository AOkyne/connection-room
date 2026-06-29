"use client";

import { DailyContent } from "@/lib/data/daily-companion";

interface FeaturedQuoteCardProps {
  quote: DailyContent | null;
}

export function FeaturedQuoteCard({ quote }: FeaturedQuoteCardProps) {
  if (!quote) return null;

  return (
    <div className="bg-gradient-to-br from-[#2a2318] to-[#3d3228] rounded-2xl p-8 shadow-sm border border-[#3d3228]">
      <div className="space-y-4">
        <p className="text-2xl italic leading-relaxed font-light text-[#ffffff]">
          "{quote.body}"
        </p>
        <p className="text-base font-medium text-[#d4a574]">— Trevor James</p>
      </div>
    </div>
  );
}
