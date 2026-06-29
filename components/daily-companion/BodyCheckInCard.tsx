"use client";

import { DailyContent } from "@/lib/data/daily-companion";
import { Card } from "@/components/Card";

interface BodyCheckInCardProps {
  checkin: DailyContent | null;
}

export function BodyCheckInCard({ checkin }: BodyCheckInCardProps) {
  if (!checkin) return null;

  return (
    <Card className="border-l-4 border-[#d4a574] bg-white">
      <div className="space-y-3">
        <p className="text-xs font-semibold text-[#d4a574] uppercase tracking-wide">
          Body Check-In
        </p>
        <p className="text-sm text-[#2a2318] font-medium leading-relaxed">{checkin.body}</p>
        <p className="text-xs text-[#6b5f52] italic">
          Pause. Close your eyes if you want. Feel your answer from your body, not your mind.
        </p>
      </div>
    </Card>
  );
}
