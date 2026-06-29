"use client";

import { Card } from "@/components/Card";
import { waysToConnect } from "@/lib/content/connection-practices";

export function WaysToConnectCard() {
  return (
    <Card className="bg-gradient-to-br from-[#f8f6f2] to-white pb-0">
      <div className="space-y-4 pb-4">
        {/* Ways - vertical stack for mobile, grid for larger screens */}
        <div className="space-y-3">
          {waysToConnect.map((way) => (
            <a
              key={way.id}
              href={way.actionHref || "#"}
              className="block px-4 py-3 rounded-lg bg-white border border-[#e8ddd2] hover:border-[#d4a348] hover:bg-[#f3ede5] transition-all"
            >
              <p className="text-sm font-medium text-[#1a0f0a]">{way.title}</p>
              <p className="text-xs text-[#1a0f0a] mt-1">{way.description}</p>
            </a>
          ))}
        </div>
      </div>
    </Card>
  );
}
