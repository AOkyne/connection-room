"use client";

import { Card } from "@/components/Card";
import { waysToConnect, waysToConnectHeader } from "@/lib/content/connection-practices";

export function WaysToConnectCard() {
  return (
    <Card className="bg-gradient-to-br from-[#f8f6f2] to-white">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-[#2a2318]">
            Ways to Connect This Week
          </h3>
          <p className="text-sm text-[#6b5f52] mt-2 leading-relaxed">
            {waysToConnectHeader}
          </p>
        </div>

        {/* Ways - vertical stack for mobile, grid for larger screens */}
        <div className="space-y-2">
          {waysToConnect.map((way) => (
            <a
              key={way.id}
              href={way.actionHref || "#"}
              className="block px-4 py-3 rounded-lg bg-white border border-[#e8ddd2] hover:border-[#d4a574] hover:bg-[#f3ede5] transition-all"
            >
              <p className="text-sm font-medium text-[#2a2318]">{way.title}</p>
              <p className="text-xs text-[#6b5f52] mt-1">{way.description}</p>
            </a>
          ))}
        </div>

        {/* Optional: Quick action buttons at bottom */}
        <div className="pt-2 border-t border-[#e8ddd2]">
          <p className="text-xs text-[#8fa878] font-medium uppercase tracking-wide mb-3">
            Quick Start
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="/app/spaces/commons"
              className="inline-block px-3 py-2 bg-[#d4a574] text-[#ffffff] rounded-lg text-sm font-medium hover:bg-[#c09560] transition-colors"
            >
              The Commons
            </a>
            <a
              href="/app"
              className="inline-block px-3 py-2 border border-[#d4a574] text-[#d4a574] rounded-lg text-sm font-medium hover:bg-[#f3ede5] transition-colors"
            >
              Today's Reflection
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}
