"use client";

import { Card } from "@/components/Card";
import {
  emptyStateHeader,
  getEmptyStatePromptsForSpace,
} from "@/lib/content/empty-state-prompts";

interface EmptySpaceInvitationProps {
  spaceId?: string;
  onStartPost?: () => void;
}

export function EmptySpaceInvitation({
  spaceId,
  onStartPost,
}: EmptySpaceInvitationProps) {
  const prompts = spaceId ? getEmptyStatePromptsForSpace(spaceId) : [];

  return (
    <Card className="bg-gradient-to-br from-[#f3ede5] to-white">
      <div className="space-y-4 text-center">
        {/* Header */}
        <div className="space-y-2">
          {emptyStateHeader.split("\n").map((line, idx) => (
            <p
              key={idx}
              className={
                idx === 0
                  ? "font-semibold text-lg text-[#2a2318]"
                  : "text-sm text-[#6b5f52] leading-relaxed"
              }
            >
              {line}
            </p>
          ))}
        </div>

        {/* Prompts */}
        {prompts.length > 0 && (
          <div className="space-y-2 pt-4">
            {prompts.slice(0, 3).map((prompt) => (
              <button
                key={prompt.id}
                onClick={onStartPost}
                className="px-4 py-3 rounded-lg bg-white border border-[#e8ddd2] hover:border-[#d4a574] hover:bg-[#f3ede5] transition-colors text-left"
              >
                <p className="text-sm text-[#6b5f52] italic">"{prompt.text}"</p>
              </button>
            ))}
          </div>
        )}

        {/* Call to Action */}
        <button
          onClick={onStartPost}
          className="inline-block px-6 py-2 bg-[#d4a574] text-[#ffffff] rounded-lg text-sm font-medium hover:bg-[#c09560] transition-colors"
        >
          Start a Reflection
        </button>
      </div>
    </Card>
  );
}
