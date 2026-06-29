"use client";

import { DailyContent } from "@/lib/data/daily-companion";
import { Card } from "@/components/Card";

interface EmbodimentPracticeCardProps {
  practice: DailyContent | null;
}

export function EmbodimentPracticeCard({ practice }: EmbodimentPracticeCardProps) {
  if (!practice) return null;

  return (
    <Card className="border-l-4 border-[#c97a2a] bg-white">
      <div className="space-y-3">
        <p className="text-xs font-semibold text-[#c97a2a] uppercase tracking-wide">
          Embodiment Practice
        </p>
        <p className="text-sm text-[#1a0f0a] leading-relaxed">{practice.body}</p>
        <p className="text-xs text-[#1a0f0a] italic">
          This practice takes just a few minutes. Your body will thank you.
        </p>
      </div>
    </Card>
  );
}
