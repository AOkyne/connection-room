"use client";
import { useEffect, useState } from "react";
import type { RoundResponseView } from "@/lib/types/connection";
import { markResponseViewed } from "@/lib/data/connectionAsync";

export function RevealPanel({
  roundId,
  responses,
  partnerName,
}: {
  roundId: string;
  responses: RoundResponseView[];
  partnerName: string;
}) {
  const mine = responses.find((r) => r.isMine);
  const theirs = responses.find((r) => !r.isMine);

  useEffect(() => {
    markResponseViewed(roundId);
  }, [roundId]);

  if (!theirs?.submittedText) {
    // Defensive -- the caller should only render RevealPanel once the round
    // is 'revealed', but get_round_responses() re-verifies server-side
    // regardless, so this can legitimately still be empty for a beat.
    return null;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-[#2f6b45]">Both responses are ready to view.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 space-y-2 border border-[#e8ddd2]">
          <p className="text-xs font-medium text-[#a0704a] uppercase">Your response</p>
          <p className="text-sm text-[#1a0f0a] whitespace-pre-wrap">{mine?.submittedText}</p>
        </div>
        <div className="bg-white rounded-lg p-4 space-y-2 border border-[#e8ddd2]">
          <p className="text-xs font-medium text-[#a0704a] uppercase">{partnerName}'s response</p>
          <p className="text-sm text-[#1a0f0a] whitespace-pre-wrap">{theirs.submittedText}</p>
        </div>
      </div>
    </div>
  );
}
