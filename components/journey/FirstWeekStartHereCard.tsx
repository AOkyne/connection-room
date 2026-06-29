"use client";

import Link from "next/link";
import { Card } from "@/components/Card";

export function FirstWeekStartHereCard() {
  return (
    <Link href="/app/journey">
      <Card className="hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-[#f3ede5] to-[#f8f6f2]">
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[#1a0f0a]">
              The Seven Doors of Connection
            </h3>
            <p className="text-sm text-[#1a0f0a] italic">
              Your guided first week journey
            </p>
          </div>

          <p className="text-sm text-[#1a0f0a] leading-relaxed">
            A structured seven-day experience designed to help you arrive, reflect, share, listen, and connect with intention. Each day opens a new door to understanding yourself and this community.
          </p>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[#c97a2a] uppercase tracking-wide">
              What's Inside
            </p>
            <ul className="text-xs text-[#1a0f0a] space-y-1 pl-3">
              <li>• Personal reflection prompts</li>
              <li>• Community connection activities</li>
              <li>• Private reflection journaling</li>
              <li>• Your first month intention</li>
            </ul>
          </div>

          <button className="text-sm text-[#d4a348] hover:text-[#c97a2a] font-medium pt-2">
            Begin Your Journey
            →
          </button>
        </div>
      </Card>
    </Link>
  );
}
