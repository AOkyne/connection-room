"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { stripPhotoFocus } from "@/lib/utils/photo-focus";

interface PhotoLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

/**
 * Full-screen view of a member's photo, uncropped. Rendered into
 * document.body so it sits above whatever modal opened it (ProfileModal,
 * ConnectionProfileModal), and closes on a tap anywhere or Escape.
 */
export function PhotoLightbox({ src, alt, onClose }: PhotoLightboxProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 text-white text-3xl leading-none w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
        aria-label="Close photo"
      >
        ✕
      </button>
      <img
        src={stripPhotoFocus(src)}
        alt={alt}
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
      />
    </div>,
    document.body
  );
}

interface ExpandablePhotoProps {
  src?: string;
  alt: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a profile photo so tapping it opens the full-size PhotoLightbox.
 * Renders children unchanged (no button) when there's no photo to show.
 */
export function ExpandablePhoto({ src, alt, children, className = "" }: ExpandablePhotoProps) {
  const [open, setOpen] = useState(false);
  if (!src) return <>{children}</>;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`cursor-zoom-in rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a348] ${className}`}
        aria-label={`View ${alt}'s photo full size`}
        title="View full size"
      >
        {children}
      </button>
      {open && <PhotoLightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}
