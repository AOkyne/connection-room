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
    <Card className="bg-gradient-to-br from-[#f3ede5] to-white border-l-4 border-[#d4a574]">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-[#2a2318]">{title}</h3>
          <p className="text-xs text-[#8fa878] font-medium uppercase tracking-wide mt-1">
            This Week in The Commons
          </p>
        </div>

        {/* Prompt */}
        <div className="bg-white rounded-lg p-4 border border-[#e8ddd2]">
          <p className="text-sm text-[#6b5f52] leading-relaxed italic">
            {trevorNote.communityInvitation}
          </p>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <p className="text-sm text-[#6b5f52]">
            Share lightly. A sentence or two is enough.
          </p>
          <p className="text-xs text-[#a0968a]">
            After you post, consider reading one other reflection and leaving a thoughtful comment.
          </p>
        </div>

        {/* Call to Action */}
        <div className="flex gap-2">
          <a
            href="/app/spaces/commons"
            className="flex-1 inline-block px-4 py-2 bg-[#d4a574] text-[#ffffff] rounded-lg text-sm font-medium text-center hover:bg-[#c09560] transition-colors"
          >
            Join This Week's Thread
          </a>
          <a
            href="/app/spaces/commons"
            className="flex-1 inline-block px-4 py-2 border border-[#d4a574] text-[#d4a574] rounded-lg text-sm font-medium text-center hover:bg-[#f3ede5] transition-colors"
          >
            Witness Others
          </a>
        </div>
      </div>
    </Card>
  );
}
