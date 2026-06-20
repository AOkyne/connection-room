"use client";

import Link from "next/link";
import { Card } from "@/components/Card";

export function FirstWeekStartHereCard() {
  return (
    <Link href="/app/my-journey">
      <Card className="hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-[#f3ede5] to-[#f8f6f2]">
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[#2a2318]">
              The Seven Doors of Connection
            </h3>
            <p className="text-sm text-[#6b5f52] italic">
              Your guided first week journey
            </p>
          </div>

          <p className="text-sm text-[#6b5f52] leading-relaxed">
            A structured seven-day experience designed to help you arrive, reflect, share, listen, and connect with intention. Each day opens a new door to understanding yourself and this community.
          </p>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide">
              What's Inside
            </p>
            <ul className="text-xs text-[#6b5f52] space-y-1 pl-3">
              <li>• Personal reflection prompts</li>
              <li>• Community connection activities</li>
              <li>• Private reflection journaling</li>
              <li>• Your first month intention</li>
            </ul>
          </div>

          <button className="text-sm text-[#d4a574] hover:text-[#8fa878] font-medium pt-2">
            Begin Your Journey
            →
          </button>
        </div>
      </Card>
    </Link>
  );
}
