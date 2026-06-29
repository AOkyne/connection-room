"use client";

import { DailyContent } from "@/lib/data/daily-companion";
import { Card } from "@/components/Card";

interface FeaturedQuoteCardProps {
  quote: DailyContent | null;
}

export function FeaturedQuoteCard({ quote }: FeaturedQuoteCardProps) {
  if (!quote) return null;

  return (
    <Card className="bg-gradient-to-br from-[#2a2318] to-[#3d3228]">
      <div className="space-y-3">
        <p className="text-lg italic leading-relaxed text-[#f4efe4]">{quote.body}</p>
        <p className="text-xs font-medium text-[#b8a88f]">— Trevor James</p>
      </div>
    </Card>
  );
}
