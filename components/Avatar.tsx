"use client";

import { useState } from "react";
import { photoFocusStyle } from "@/lib/utils/photo-focus";
import { ExpandablePhoto } from "@/components/PhotoLightbox";

interface AvatarProps {
  name: string;
  photo?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  // Tapping the photo opens it full size (PhotoLightbox). Off by default:
  // most avatars sit inside links/buttons that already do something.
  expandable?: boolean;
}

export function Avatar({ name, photo, size = "md", expandable = false }: AvatarProps) {
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

  // sm/md/lg/xl doubled from their original size (member thumbnails in
  // space banners/posts/comments/grids were too small to recognize faces
  // at a glance). 2xl is deliberately left unchanged -- it's only used for
  // the Connections page's main partner photo, which is already the right
  // size.
  const sizeClasses = {
    sm: "w-12 h-12 text-sm",
    md: "w-16 h-16 text-base",
    lg: "w-24 h-24 text-xl",
    xl: "w-40 h-40 text-3xl",
    "2xl": "w-28 h-28 text-2xl",
  };

  // If photo exists and hasn't failed to load, display it
  if (photo && !photoError) {
    const img = (
      <img
        src={photo}
        style={photoFocusStyle(photo)}
        alt={name}
        onError={() => setPhotoError(true)}
        // object-top biases the crop toward the upper portion of the photo
        // instead of dead-center -- most member photos are portraits with
        // the face in the upper half, so a centered crop was clipping
        // foreheads/hair in the circular thumbnail.
        className={`${sizeClasses[size]} rounded-full object-cover object-top border border-[#dcc4b3]`}
      />
    );
    return expandable ? (
      <ExpandablePhoto src={photo} alt={name} className="flex-shrink-0">
        {img}
      </ExpandablePhoto>
    ) : (
      img
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
