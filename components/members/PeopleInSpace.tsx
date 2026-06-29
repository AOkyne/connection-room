"use client";

import Link from "next/link";
import { Profile } from "@/lib/data/profiles";

interface PeopleInSpaceProps {
  members: Profile[];
  spaceId: string;
  displayCount?: number;
}

export function PeopleInSpace({
  members,
  spaceId,
  displayCount = 6,
}: PeopleInSpaceProps) {
  const displayMembers = members.slice(0, displayCount);
  const remainingCount = Math.max(0, members.length - displayCount);

  if (members.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-[#1a0f0a] mb-2">
          People in This Space
        </h3>
        <p className="text-sm text-[#1a0f0a]">
          Meet the members exploring this topic together.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {displayMembers.map((member) => (
          <Link key={member.id} href={`/members/${member.id}`}>
            <div className="group cursor-pointer">
              <div className="relative overflow-hidden rounded-lg mb-2 aspect-square bg-[#f0e8e0]">
                <img
                  src={member.profilePhoto}
                  alt={member.displayName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm text-[#1a0f0a] group-hover:text-[#d4a348] transition-colors">
                  {member.displayName}
                </p>
                {member.pronouns && (
                  <p className="text-xs text-[#a0704a]">{member.pronouns}</p>
                )}
                {member.profile_tagline && (
                  <p className="text-xs text-[#1a0f0a] italic">
                    "{member.profile_tagline}"
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {remainingCount > 0 && (
        <div className="pt-2">
          <Link
            href={`/app/spaces/${spaceId}/members`}
            className="inline-block text-sm font-medium text-[#d4a348] hover:text-[#c9956d] transition-colors"
          >
            See all {members.length} members
          </Link>
        </div>
      )}
    </section>
  );
}
