"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { ConnectionProfileModal } from "./ConnectionProfileModal";
import { sendConnectionRequest, hasRequestSent } from "@/lib/data/connectionRequests";
import type { MatchScore } from "@/lib/utils/connectionMatching";
import type { Profile } from "@/lib/data/profiles";

interface SuggestedConnectionsProps {
  matches: MatchScore[];
  onSelectMatch: (matchId: string) => void;
  loading?: boolean;
  currentUserId?: string;
  currentUserName?: string;
  currentUserPhoto?: string;
}

function getScoreColor(score: number): string {
  if (score >= 75) return "text-[#c97a2a]";
  if (score >= 50) return "text-[#d4a348]";
  return "text-[#a0704a]";
}

function getScoreBgColor(score: number): string {
  if (score >= 75) return "bg-[#c97a2a]/10";
  if (score >= 50) return "bg-[#d4a348]/10";
  return "bg-[#a0704a]/10";
}

export function SuggestedConnections({
  matches,
  onSelectMatch,
  loading = false,
  currentUserId,
  currentUserName = "",
  currentUserPhoto = "",
}: SuggestedConnectionsProps) {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Track which requests have been sent
    if (currentUserId) {
      const requestedIds = new Set<string>();
      matches.forEach((match) => {
        if (hasRequestSent(currentUserId, match.profile.id)) {
          requestedIds.add(match.profile.id);
        }
      });
      setSentRequests(requestedIds);
    }
  }, [currentUserId, matches]);

  const handleViewProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsModalOpen(true);
  };

  const handleSendRequest = (profileId: string) => {
    if (currentUserId && currentUserName && currentUserPhoto) {
      sendConnectionRequest(currentUserId, currentUserName, currentUserPhoto, profileId);
      setSentRequests((prev) => new Set([...prev, profileId]));
    }
  };

  const handleConnectFromModal = () => {
    if (selectedProfile) {
      onSelectMatch(selectedProfile.id);
      setIsModalOpen(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Suggested Connections" icon="🔗" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-[#f3ede5] rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader title="Suggested Connections" icon="🔗" />
        <p className="text-center text-[#1a0f0a] py-6">
          No potential matches available right now. Check back soon!
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader title="Suggested Connections" icon="🔗" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {matches.map((match) => (
            <div
              key={match.profile.id}
              className="flex flex-col bg-[#f3ede5] rounded-lg overflow-hidden hover:bg-[#e8ddd2] transition-colors"
            >
              <button
                onClick={() => handleViewProfile(match.profile)}
                className="flex flex-col items-center text-center hover:opacity-90 transition-opacity flex-1"
              >
                {match.profile.profilePhoto && (
                  <img
                    src={match.profile.profilePhoto}
                    alt={match.profile.displayName}
                    className="w-full aspect-square object-cover"
                  />
                )}

                <div className="p-3 w-full">
                  <p className="font-medium text-[#1a0f0a] text-sm line-clamp-2 mb-1">
                    {match.profile.displayName}
                    {match.profile.pronouns && ` (${match.profile.pronouns})`}
                  </p>

                  <p className="text-xs text-[#a0704a] mb-2 line-clamp-1">
                    {match.profile.location}
                  </p>

                  <div className={`px-2 py-1 rounded-full mb-2 inline-block ${getScoreBgColor(match.score)}`}>
                    <p className={`text-xs font-medium ${getScoreColor(match.score)}`}>
                      {Math.round(match.score)}% match
                    </p>
                  </div>

                  {match.sharedInterests.length > 0 && (
                    <p className="text-xs text-[#1a0f0a]">
                      {match.sharedInterests.length} shared interest{match.sharedInterests.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </button>

              {sentRequests.has(match.profile.id) ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full rounded-none mt-auto"
                >
                  Request Pending
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleViewProfile(match.profile)}
                  className="w-full rounded-none mt-auto"
                >
                  View Profile
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <ConnectionProfileModal
        profile={selectedProfile}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUserId={currentUserId}
        onSendRequest={handleSendRequest}
        requestPending={selectedProfile ? sentRequests.has(selectedProfile.id) : false}
      />
    </>
  );
}
