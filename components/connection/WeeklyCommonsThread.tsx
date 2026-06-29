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
            Share lightly. A sentence or two is enough.
          </p>
          <p className="text-xs text-[#a0704a]">
            After you post, consider reading one other reflection and leaving a thoughtful comment.
          </p>
        </div>

        {/* Call to Action */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              const createPostSection = document.getElementById("create-post-section");
              if (createPostSection) {
                createPostSection.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            className="flex-1 px-4 py-2 bg-[#d4a348] text-[#ffffff] rounded-lg text-sm font-medium hover:bg-[#c09560] transition-colors"
          >
            Join This Week's Thread
          </button>
          <button
            onClick={() => {
              const postsFeed = document.getElementById("posts-feed");
              if (postsFeed) {
                postsFeed.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            className="flex-1 px-4 py-2 border border-[#d4a348] text-[#d4a348] rounded-lg text-sm font-medium hover:bg-[#f3ede5] transition-colors"
          >
            Witness Others
          </button>
        </div>
      </div>
    </Card>
  );
}
