"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import { getInitials, getInitialColor } from "@/lib/utils/initials";

interface ProfileModalProps {
  userId: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  pronouns?: string;
  profilePhoto?: string;
  location?: string;
  profile_tagline?: string;
  interests?: string[];
  whatBroughtYouHere?: string;
  connectionHoping?: string;
  ageRange?: string;
  orientation?: string;
  relationshipStatus?: string;
  quizResult?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({
  firstName,
  lastName,
  displayName,
  pronouns,
  profilePhoto,
  location,
  profile_tagline,
  interests,
  whatBroughtYouHere,
  connectionHoping,
  ageRange,
  orientation,
  relationshipStatus,
  quizResult,
  isOpen,
  onClose,
}: ProfileModalProps) {
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || displayName;
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setPhotoError(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close Button */}
        <div className="sticky top-0 bg-white border-b border-[#e8ddd2] p-4 flex justify-end">
          <button
            onClick={onClose}
            className="text-2xl text-[#a0704a] hover:text-[#1a0f0a] transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile Photo and Name */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {profilePhoto && !photoError ? (
                <img
                  src={profilePhoto}
                  alt={displayName}
                  onError={() => setPhotoError(true)}
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#d4a348]"
                />
              ) : (
                <div
                  style={{
                    width: 96,
                    height: 96,
                    backgroundColor: getInitialColor(fullName),
                    color: "white",
                  }}
                  className="rounded-full flex items-center justify-center border-2 border-[#d4a348] font-bold text-2xl"
                >
                  {getInitials(fullName)}
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-[#1a0f0a]">
              {fullName}
              {pronouns && <span className="text-sm text-[#1a0f0a] ml-2">({pronouns})</span>}
            </h2>
          </div>

          {/* Location and Basic Info */}
          <div className="space-y-3 text-center text-[#1a0f0a]">
            {location && <p className="text-sm">📍 {location}</p>}
            {ageRange && <p className="text-sm">{ageRange}</p>}
            {orientation && relationshipStatus && (
              <p className="text-sm">
                {orientation} • {relationshipStatus}
              </p>
            )}
          </div>

          {/* Tagline */}
          {profile_tagline && (
            <div className="bg-[#f3ede5] p-4 rounded-lg">
              <p className="text-center font-medium text-[#1a0f0a] italic">{profile_tagline}</p>
            </div>
          )}

          {/* Quiz Result */}
          {quizResult && (
            <div className="border-l-4 border-[#d4a348] pl-4">
              <p className="text-xs uppercase tracking-wide text-[#a0704a] mb-1">Connection Pattern</p>
              <p className="font-medium text-[#1a0f0a]">{quizResult}</p>
            </div>
          )}

          {/* Interests */}
          {interests && interests.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#a0704a] mb-3">Interests</p>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <span
                    key={interest}
                    className="bg-[#d4a348]/10 text-[#8a6f4f] text-sm px-3 py-1 rounded-full"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* What Brought You Here */}
          {whatBroughtYouHere && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#a0704a] mb-2">What brought them here</p>
              <p className="text-sm text-[#1a0f0a] leading-relaxed">{whatBroughtYouHere}</p>
            </div>
          )}

          {/* Connection Hoping */}
          {connectionHoping && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#a0704a] mb-2">Looking to connect with</p>
              <p className="text-sm text-[#1a0f0a] leading-relaxed">{connectionHoping}</p>
            </div>
          )}

          {/* Close Button */}
          <Button variant="outline" size="md" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>

      {/* Backdrop click closes modal */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
