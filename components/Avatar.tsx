"use client";

import { useState } from "react";

interface AvatarProps {
  name: string;
  photo?: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ name, photo, size = "md" }: AvatarProps) {
  const [photoError, setPhotoError] = useState(false);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    "bg-[#d4a348]",
    "bg-[#8b6f47]",
    "bg-[#c97a2a]",
    "bg-[#a84a2a]",
    "bg-[#a0704a]",
  ];
  const color = colors[initials.charCodeAt(0) % colors.length];

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-12 h-12 text-base",
  };

  // If photo exists and hasn't failed to load, display it
  if (photo && !photoError) {
    return (
      <img
        src={photo}
        alt={name}
        onError={() => setPhotoError(true)}
        className={`${sizeClasses[size]} rounded-full object-cover border border-[#dcc4b3]`}
      />
    );
  }

  // Otherwise show initials
  return (
    <div
      className={`${color} ${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white border border-[#dcc4b3]`}
    >
      {initials}
    </div>
  );
}
