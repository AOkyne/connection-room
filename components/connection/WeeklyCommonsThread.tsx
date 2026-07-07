"use client";

import { Card } from "@/components/Card";
import { getCurrentTrevorNote } from "@/lib/content/trevor-notes";

interface WeeklyCommonsThreadProps {
  weekNumber?: number;
}

export function WeeklyCommonsThread({ weekNumber }: WeeklyCommonsThreadProps) {
  const trevorNote = getCurrentTrevorNote();

  const threadTitles = [
    "This Week's Check-In",
    "The Listening Thread",
    "The Question I'm Carrying",
    "Small Honesty Thread",
  ];

  const title = threadTitles[(weekNumber || 1) - 1] || threadTitles[0];

  return (
    <Card className="bg-gradient-to-br from-[#f3ede5] to-white border-l-4 border-[#d4a348]">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-[#1a0f0a]">{title}</h3>
          <p className="text-xs text-[#c97a2a] font-medium uppercase tracking-wide mt-1">
            This Week in The Commons
          </p>
        </div>

        {/* Prompt */}
        <div className="bg-white rounded-lg p-4 border border-[#e8ddd2]">
          <p className="text-sm text-[#1a0f0a] leading-relaxed italic">
            {trevorNote.communityInvitation}
          </p>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <p className="text-sm text-[#1a0f0a]">
            Share as little or as much as you like.
          </p>
          <p className="text-xs text-[#a0704a]">
            After you post, consider reading one other reflection and leaving a thoughtful comment.
          </p>
        </div>
      </div>
    </Card>
  );
}
