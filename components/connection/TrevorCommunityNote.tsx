"use client";

import { Card } from "@/components/Card";
import { getCurrentTrevorNote } from "@/lib/content/trevor-notes";

interface TrevorCommunityNoteProps {
  variant?: "dashboard" | "commons";
}

export function TrevorCommunityNote({ variant = "dashboard" }: TrevorCommunityNoteProps) {
  const trevorNote = getCurrentTrevorNote();

  return (
    <Card
      className={`${
        variant === "commons"
          ? "bg-gradient-to-br from-[#f3ede5] to-white border-l-4 border-[#d4a348]"
          : "bg-white"
      }`}
    >
      <div className="space-y-4">
        {/* Header with Photo */}
        <div className="flex items-start gap-4">
          <img
            src="/trevor-photo.png"
            alt="Trevor James"
            className="w-20 h-20 rounded-full flex-shrink-0 object-cover"
            style={{ objectPosition: "center 20%" }}
          />
          <h3 className="text-lg font-semibold text-[#1a0f0a]">A Note from Trevor</h3>
        </div>

        {/* Note Content */}
        <div className="bg-[#f8f6f2] rounded-lg p-4">
          <p className="text-sm text-[#1a0f0a] leading-relaxed italic">
            {trevorNote.note}
          </p>
        </div>

        {/* Community Invitation */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-[#c97a2a] uppercase tracking-wide">
            This Week's Invitation
          </p>
          <p className="text-sm text-[#1a0f0a] leading-relaxed">
            {trevorNote.communityInvitation}
          </p>

          {/* CTA */}
          <a
            href="/app/spaces/commons"
            className="inline-block px-4 py-2 bg-[#d4a348] text-[#ffffff] rounded-lg text-sm font-medium hover:bg-[#c09560] transition-colors"
          >
            Respond in The Commons
          </a>
        </div>
      </div>
    </Card>
  );
}
