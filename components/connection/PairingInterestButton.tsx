"use client";

import { useState } from "react";
import { saveConnectionInterest } from "@/lib/data/connection-practice";
import { getProfile } from "@/lib/data/profiles";
import { connectionInterestPrompt } from "@/lib/content/connection-practices";

interface ConnectionInterestButtonProps {
  theme: string;
  sourceType: "prompt" | "post" | "weekly_theme" | "space";
  spaceId?: string;
  promptId?: string;
}

export function ConnectionInterestButton({
  theme,
  sourceType,
  spaceId,
  promptId,
}: ConnectionInterestButtonProps) {
  const [clicked, setClicked] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const handleClick = async () => {
    try {
      const profile = await getProfile();
      if (profile) {
        await saveConnectionInterest({
          userId: profile.id,
          theme,
          sourceType,
          spaceId,
          promptId,
          createdAt: new Date(),
        });
        setClicked(true);
        setTimeout(() => setClicked(false), 3000);
      }
    } catch (error) {
      console.error("Error saving connection interest:", error);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={clicked}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          clicked
            ? "bg-[#c97a2a] text-[#ffffff]"
            : "border border-[#d4a348] text-[#d4a348] hover:bg-[#f3ede5]"
        }`}
      >
        {clicked ? "✓ Interest saved" : "Open to connection around this theme"}
      </button>

      {/* Info Toggle */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="text-xs text-[#c97a2a] hover:underline"
      >
        {showInfo ? "Hide info" : "What does this mean?"}
      </button>

      {/* Info */}
      {showInfo && (
        <div className="bg-[#f8f6f2] rounded-lg p-3 text-xs text-[#1a0f0a] space-y-2">
          <p>{connectionInterestPrompt}</p>
          <p className="italic text-[#a0704a]">
            We'll use this to suggest meaningful connections once our connection system is ready.
          </p>
        </div>
      )}
    </div>
  );
}
