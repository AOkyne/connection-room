"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { ConnectionProfileModal } from "./ConnectionProfileModal";
import { createConnectionInvitation } from "@/lib/data/connectionAsync";
import type { MatchScore } from "@/lib/matching";
import type { CommunityProfile } from "@/lib/data/profiles";

// Async-invitation counterpart to SuggestedConnections.tsx -- same card
// layout and ConnectionProfileModal, but "Connect" creates a
// connections/connection_participants invitation via
// create_connection_invitation() instead of a legacy connection_requests
// row. Kept as a separate component rather than branching
// SuggestedConnections internally: the two flows write to genuinely
// different tables/RPCs and have different "already sent" bookkeeping.
export function GuidedConnectionSuggestions({
  matches,
  loading = false,
  onInvited,
}: {
  matches: MatchScore[];
  loading?: boolean;
  onInvited: (partnerId: string) => void;
}) {
  const [selectedProfile, setSelectedProfile] = useState<CommunityProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const matchesWithPhotos = matches.filter((m) => m.profile.profilePhoto);

  const handleViewProfile = (profile: CommunityProfile) => {
    setSelectedProfile(profile);
    setIsModalOpen(true);
  };

  const handleInvite = async (partnerId: string) => {
    setSending(true);
    const connectionId = await createConnectionInvitation(partnerId, { connectionType: "async" });
    setSending(false);
    if (connectionId) {
      setInvitedIds((prev) => new Set([...prev, partnerId]));
      onInvited(partnerId);
      setIsModalOpen(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Suggested Guided Connections" icon="🔗" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-[#f3ede5] rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (matchesWithPhotos.length === 0) {
    return (
      <Card>
        <CardHeader title="Suggested Guided Connections" icon="🔗" />
        <p className="text-center text-[#1a0f0a] py-6">No potential matches available right now. Check back soon!</p>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader title="Suggested Guided Connections" icon="🔗" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {matchesWithPhotos.map((match) => (
            <div key={match.profile.id} className="flex flex-col bg-[#f3ede5] rounded-lg overflow-hidden hover:bg-[#e8ddd2] transition-colors">
              <button onClick={() => handleViewProfile(match.profile)} className="flex flex-col items-center text-center hover:opacity-90 transition-opacity flex-1">
                <img src={match.profile.profilePhoto} alt={match.profile.displayName} className="w-full aspect-square object-cover" />
                <div className="p-3 w-full">
                  <p className="font-medium text-[#1a0f0a] text-sm line-clamp-2 mb-1">
                    {match.profile.displayName}
                    {match.profile.pronouns && ` (${match.profile.pronouns})`}
                  </p>
                  <p className="text-xs text-[#a0704a] mb-2 line-clamp-1">{match.profile.location}</p>
                  {match.sharedInterests.length > 0 && (
                    <p className="text-xs text-[#1a0f0a]">
                      {match.sharedInterests.length} shared interest{match.sharedInterests.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </button>
              {invitedIds.has(match.profile.id) ? (
                <Button variant="outline" size="sm" disabled className="w-full rounded-none mt-auto">
                  Invitation sent
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => handleViewProfile(match.profile)} className="w-full rounded-none mt-auto">
                  View profile
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
        onSendRequest={handleInvite}
        requestPending={selectedProfile ? invitedIds.has(selectedProfile.id) || sending : false}
      />
    </>
  );
}
