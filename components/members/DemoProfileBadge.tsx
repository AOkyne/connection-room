"use client";

import { Profile } from "@/lib/data/profiles";

interface DemoProfileBadgeProps {
  member: Profile;
  size?: "sm" | "md";
}

export function DemoProfileBadge({ member, size = "md" }: DemoProfileBadgeProps) {
  if (!member.is_demo_profile) {
    return null;
  }

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
  };

  return (
    <span className={`bg-[#e8ddd2] text-[#a0704a] font-normal rounded ${sizeClasses[size]}`}>
      Sample
    </span>
  );
}
