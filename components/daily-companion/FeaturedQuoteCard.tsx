"use client";

import { DailyContent } from "@/lib/data/daily-companion";
import { Card } from "@/components/Card";

interface FeaturedQuoteCardProps {
  quote: DailyContent | null;
}

export function FeaturedQuoteCard({ quote }: FeaturedQuoteCardProps) {
  if (!quote) return null;

  return (
    <Card className="bg-gradient-to-br from-[#2a2318] to-[#3d3228] py-8 min-h-[120px] flex items-center">
      <div className="space-y-4 w-full">
        <p className="text-xl italic leading-relaxed text-white">"{quote.body}"</p>
        <p className="text-sm font-medium text-[#d4a574]">— Trevor James</p>
      </div>
    </Card>
  );
}
