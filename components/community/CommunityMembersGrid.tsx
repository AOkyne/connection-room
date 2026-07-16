"use client";

import { useEffect, useState } from "react";
import { getDiscoverableMembers, type Profile } from "@/lib/data/profiles";

export function CommunityMembersGrid() {
  // Real, discoverable members -- this was hardcoded to a random sample of
  // lib/seed/demo-members and never queried the database at all, so real
  // members never appeared here regardless of how many actually joined.
  const [members, setMembers] = useState<Profile[]>([]);

  useEffect(() => {
    getDiscoverableMembers(10).then((all) => {
      // Shuffle client-side so the same 10 aren't always shown first.
      setMembers([...all].sort(() => Math.random() - 0.5).slice(0, 10));
    });
  }, []);

  if (members.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-[#c97a2a] uppercase tracking-wide">Community Members</h4>
      <div className="flex flex-wrap gap-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            {member.profilePhoto ? (
              <img
                src={member.profilePhoto}
                alt={member.displayName}
                className="w-12 h-12 rounded-full object-cover border-2 border-[#e8ddd2] group-hover:border-[#d4a348] transition-colors"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#f3ede5] border-2 border-[#e8ddd2] flex items-center justify-center text-xs font-bold text-[#d4a348]">
                {member.displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            )}
            <p className="text-xs text-[#1a0f0a] text-center max-w-[60px] line-clamp-2 group-hover:text-[#d4a348] transition-colors">
              {member.displayName}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
