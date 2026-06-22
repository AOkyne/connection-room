"use client";

import Link from "next/link";
import { Profile } from "@/lib/data/profiles";

interface SpaceMemberAvatarsProps {
  members: Profile[];
  spaceId: string;
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
}

export function SpaceMemberAvatars({
  members,
  spaceId,
  maxVisible = 5,
  size = "md",
}: SpaceMemberAvatarsProps) {
  const displayMembers = members.slice(0, maxVisible);
  const remainingCount = Math.max(0, members.length - maxVisible);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const overlapClasses = {
    sm: "-ml-2",
    md: "-ml-3",
    lg: "-ml-4",
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {displayMembers.map((member, idx) => (
          <Link key={member.id} href={`/members/${member.id}`}>
            <div
              className={`${sizeClasses[size]} rounded-full border-2 border-white overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-[#d4a574] transition-all ${
                idx > 0 ? overlapClasses[size] : ""
              }`}
              title={`${member.displayName} (${member.pronouns || "they/them"})`}
            >
              <img
                src={member.profilePhoto}
                alt={member.displayName}
                className="w-full h-full object-cover"
              />
            </div>
          </Link>
        ))}
      </div>

      <div className="text-sm">
        <p className="font-medium text-[#2a2318]">{members.length}</p>
        <p className="text-xs text-[#a0968a]">
          {members.length === 1 ? "member" : "members"}
        </p>
      </div>

      {remainingCount > 0 && (
        <Link
          href={`/app/spaces/${spaceId}/members`}
          className="text-xs text-[#d4a574] hover:text-[#c9956d] font-medium ml-1"
        >
          +{remainingCount} more
        </Link>
      )}
    </div>
  );
}
