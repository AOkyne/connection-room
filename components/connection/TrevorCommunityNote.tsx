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
          ? "bg-gradient-to-br from-[#f3ede5] to-white border-l-4 border-[#d4a574]"
          : "bg-white"
      }`}
    >
      <div className="space-y-4">
        {/* Header */}
        <h3 className="text-lg font-semibold text-[#2a2318]">A Note from Trevor</h3>

        {/* Note Content */}
        <div className="bg-[#f8f6f2] rounded-lg p-4">
          <p className="text-sm text-[#6b5f52] leading-relaxed italic">
            {trevorNote.note}
          </p>
        </div>

        {/* Community Invitation */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide">
            This Week's Invitation
          </p>
          <p className="text-sm text-[#6b5f52] leading-relaxed">
            {trevorNote.communityInvitation}
          </p>

          {/* CTA */}
          <a
            href="/app/spaces/commons"
            className="inline-block px-4 py-2 bg-[#d4a574] text-[#ffffff] rounded-lg text-sm font-medium hover:bg-[#c09560] transition-colors"
          >
            Respond in The Commons
          </a>
        </div>
      </div>
    </Card>
  );
}
