"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTotalNewPostCount } from "@/lib/data/spaces";

interface WelcomeBackBannerProps {
  firstName: string;
}

// Surfaces the same unread-post count already shown ambiently in the
// sidebar/Spaces-page badges (getTotalNewPostCount, see lib/data/spaces.ts)
// as an actual "welcome back" moment on the home page, right after login.
// Deliberately reuses that exact function rather than a separate "since
// last login" concept -- keeps this number always in agreement with the
// badges instead of risking two different "unread" counts disagreeing.
export function WelcomeBackBanner({ firstName }: WelcomeBackBannerProps) {
  const [newPostCount, setNewPostCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getTotalNewPostCount().then(setNewPostCount);
  }, []);

  if (dismissed || newPostCount === 0) return null;

  return (
    <div className="bg-gradient-to-br from-[#f3ede5] to-[#fffbf7] border border-[#e8ddd2] rounded-2xl p-5 flex items-center justify-between gap-4">
      <div>
        <p className="text-lg font-semibold text-[#1a0f0a]">
          Welcome back, {firstName || "friend"}.
        </p>
        <p className="text-sm text-[#6b6460] mt-1">
          You have {newPostCount} new post{newPostCount === 1 ? "" : "s"} across your spaces.
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          href="/app/spaces"
          className="text-sm font-medium text-white bg-[#d4a348] hover:bg-[#c9956d] transition-colors px-4 py-2 rounded-full whitespace-nowrap"
        >
          See what&apos;s new
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="text-[#a0704a] hover:text-[#1a0f0a] text-xl leading-none"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
