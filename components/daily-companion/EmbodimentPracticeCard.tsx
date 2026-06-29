"use client";

import { DailyContent } from "@/lib/data/daily-companion";
import { Card } from "@/components/Card";

interface EmbodimentPracticeCardProps {
  practice: DailyContent | null;
}

export function EmbodimentPracticeCard({ practice }: EmbodimentPracticeCardProps) {
  if (!practice) return null;

  return (
    <Card className="border-l-4 border-[#8fa878] bg-white">
      <div className="space-y-3">
        <p className="text-xs font-semibold text-[#8fa878] uppercase tracking-wide">
          Embodiment Practice
        </p>
        <p className="text-sm text-[#2a2318] leading-relaxed">{practice.body}</p>
        <p className="text-xs text-[#6b5f52] italic">
          This practice takes just a few minutes. Your body will thank you.
        </p>
      </div>
    </Card>
  );
}
