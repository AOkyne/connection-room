"use client";

import { DailyContent } from "@/lib/data/daily-companion";
import { Card } from "@/components/Card";

interface FeaturedQuoteCardProps {
  quote: DailyContent | null;
}

export function FeaturedQuoteCard({ quote }: FeaturedQuoteCardProps) {
  if (!quote) return null;

  return (
    <Card className="bg-gradient-to-br from-[#2a2318] to-[#3d3228] text-[#f4efe4]">
      <div className="space-y-2">
        <p className="text-lg italic leading-relaxed">{quote.body}</p>
        <p className="text-xs text-[#cfc4ad] font-medium">— Trevor James</p>
      </div>
    </Card>
  );
}
