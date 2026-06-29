"use client";

import { useState } from "react";
import { commentingGuide } from "@/lib/content/commenting-guide";

interface CommentingGuideHelperProps {
  compact?: boolean;
}

export function CommentingGuideHelper({ compact = false }: CommentingGuideHelperProps) {
  const [showFull, setShowFull] = useState(false);

  if (compact) {
    return (
      <div className="text-xs text-[#a0704a] space-y-2">
        <p>
          Try presence before advice. "I relate to this" or "Thank you for sharing" is enough.
        </p>
        <button
          onClick={() => setShowFull(!showFull)}
          className="text-[#c97a2a] hover:underline"
        >
          {showFull ? "Hide guide" : "Responding with care →"}
        </button>
        {showFull && <CommentingGuideContent />}
      </div>
    );
  }

  return <CommentingGuideContent />;
}

function CommentingGuideContent() {
  return (
    <div className="bg-[#f8f6f2] rounded-lg p-4 space-y-3 text-sm">
      <div>
        <p className="font-medium text-[#1a0f0a] mb-2">{commentingGuide.title}</p>
        <p className="text-[#1a0f0a] italic mb-3">{commentingGuide.tagline}</p>
      </div>

      {/* Helpful Responses */}
      <div>
        <p className="font-medium text-[#1a0f0a] mb-2">Helpful responses:</p>
        <ul className="space-y-1">
          {commentingGuide.helpfulResponses.map((response, idx) => (
            <li key={idx} className="text-[#1a0f0a] flex gap-2">
              <span className="text-[#d4a348]">•</span>
              <span>{response}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Less Helpful Responses */}
      <div>
        <p className="font-medium text-[#1a0f0a] mb-2">Less helpful:</p>
        <ul className="space-y-1">
          {commentingGuide.lessHelpfulResponses.map((response, idx) => (
            <li key={idx} className="text-[#1a0f0a] flex gap-2">
              <span className="text-[#a0704a]">—</span>
              <span>{response}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Closing Note */}
      <p className="text-[#1a0f0a] italic pt-2 border-t border-[#e8ddd2]">
        {commentingGuide.closingNote}
      </p>
    </div>
  );
}
