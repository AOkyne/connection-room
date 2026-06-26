"use client";

import { Button } from "@/components/Button";
import type { Profile } from "@/lib/data/profiles";

interface ConnectionProfileModalProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onConnect?: () => void;
  showConnectButton?: boolean;
  currentUserId?: string;
  onSendRequest?: (userId: string) => void;
  requestPending?: boolean;
}

export function ConnectionProfileModal({
  profile,
  isOpen,
  onClose,
  onConnect,
  showConnectButton = false,
  currentUserId,
  onSendRequest,
  requestPending = false,
}: ConnectionProfileModalProps) {
  if (!isOpen || !profile) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-[#f3ede5] to-[#fffbf7] border-b border-[#e8ddd2] p-6 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-medium text-[#2a2318]">
              {profile.displayName}
            </h2>
            {profile.pronouns && (
              <p className="text-sm text-[#a0968a] mt-1">{profile.pronouns}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#a0968a] hover:text-[#2a2318] text-2xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Photo */}
          {profile.profilePhoto && (
            <img
              src={profile.profilePhoto}
              alt={profile.displayName}
              className="w-32 h-32 rounded-2xl object-cover"
            />
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            {profile.location && (
              <div>
                <p className="text-xs text-[#a0968a] uppercase tracking-wide mb-1">
                  Location
                </p>
                <p className="text-[#2a2318]">{profile.location}</p>
              </div>
            )}
            {profile.ageRange && (
              <div>
                <p className="text-xs text-[#a0968a] uppercase tracking-wide mb-1">
                  Age Range
                </p>
                <p className="text-[#2a2318]">{profile.ageRange}</p>
              </div>
            )}
            {profile.relationshipStatus && (
              <div>
                <p className="text-xs text-[#a0968a] uppercase tracking-wide mb-1">
                  Relationship Status
                </p>
                <p className="text-[#2a2318]">{profile.relationshipStatus}</p>
              </div>
            )}
            {profile.orientation && (
              <div>
                <p className="text-xs text-[#a0968a] uppercase tracking-wide mb-1">
                  Orientation
                </p>
                <p className="text-[#2a2318]">{profile.orientation}</p>
              </div>
            )}
          </div>

          {/* Member Since */}
          <div className="bg-[#f3ede5] rounded-lg p-4">
            <p className="text-xs text-[#a0968a] uppercase tracking-wide mb-1">
              Member Since
            </p>
            <p className="text-[#2a2318]">
              {new Date(profile.joinedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {/* What Brought Them Here */}
          {profile.whatBroughtYouHere && (
            <div>
              <p className="text-sm font-medium text-[#2a2318] mb-2">
                What brought them here
              </p>
              <p className="text-[#6b5f52] leading-relaxed">
                {profile.whatBroughtYouHere}
              </p>
            </div>
          )}

          {/* Connection Hopes */}
          {profile.connectionHoping && (
            <div>
              <p className="text-sm font-medium text-[#2a2318] mb-2">
                Kind of connection they're seeking
              </p>
              <p className="text-[#6b5f52] leading-relaxed">
                {profile.connectionHoping}
              </p>
            </div>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div>
              <p className="text-sm font-medium text-[#2a2318] mb-3">Interests</p>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="bg-[#e8ddd2] text-[#2a2318] px-4 py-2 rounded-full text-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Connection Comfort Level */}
          {profile.connectionComfortLevel && (
            <div>
              <p className="text-sm font-medium text-[#2a2318] mb-2">
                Connection comfort level
              </p>
              <p className="text-[#6b5f52] leading-relaxed">
                {profile.connectionComfortLevel}
              </p>
            </div>
          )}

          {/* Connection Boundaries */}
          {profile.connectionBoundaries && (
            <div>
              <p className="text-sm font-medium text-[#2a2318] mb-2">
                Connection boundaries
              </p>
              <p className="text-[#6b5f52] leading-relaxed">
                {profile.connectionBoundaries}
              </p>
            </div>
          )}

          {/* Profile Tagline */}
          {profile.profile_tagline && (
            <div className="bg-[#fffbf7] border-2 border-[#d4a574] rounded-lg p-4 italic text-[#6b5f52]">
              "{profile.profile_tagline}"
            </div>
          )}

          {/* Connect Button */}
          {showConnectButton && onConnect && (
            <div className="flex gap-3 pt-4">
              <Button
                variant="primary"
                size="md"
                onClick={onConnect}
                className="flex-1"
              >
                Connect with {profile.displayName.split(" ")[0]}
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={onClose}
                className="flex-1"
              >
                Back
              </Button>
            </div>
          )}

          {currentUserId && profile && onSendRequest && !showConnectButton && (
            <div className="flex gap-3 pt-4">
              {requestPending ? (
                <Button
                  variant="outline"
                  size="md"
                  disabled
                  className="flex-1"
                >
                  Request Sent
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => onSendRequest(profile.id)}
                  className="flex-1"
                >
                  Send Connection Request
                </Button>
              )}
              <Button
                variant="ghost"
                size="md"
                onClick={onClose}
                className="flex-1"
              >
                Back
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
