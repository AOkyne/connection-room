"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { ConnectionProfileModal } from "./ConnectionProfileModal";
import { checkMutualRequest } from "@/lib/data/connectionRequests";
import type { ConnectionRequest } from "@/lib/data/connectionRequests";
import type { Profile } from "@/lib/data/profiles";

interface IncomingRequestsProps {
  requests: ConnectionRequest[];
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  currentUserId?: string;
  requesterProfiles?: Record<string, Profile>;
}

export function IncomingRequests({
  requests,
  onAccept,
  onDecline,
  currentUserId,
  requesterProfiles = {},
}: IncomingRequestsProps) {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (requests.length === 0) {
    return null;
  }

  const mutualRequests = requests.filter(
    (r) => currentUserId && checkMutualRequest(currentUserId, r.fromUserId)
  );

  const handleViewProfile = (request: ConnectionRequest) => {
    const profile = requesterProfiles[request.fromUserId];
    if (profile) {
      setSelectedProfile(profile);
      setIsModalOpen(true);
    }
  };

  const handleAcceptFromModal = (requestId: string) => {
    onAccept(requestId);
    setIsModalOpen(false);
  };

  return (
    <Card className="border-2 border-[#d4a348] bg-[#fffbf7]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-[#1a0f0a]">
          Connection Requests
          <span className="ml-2 inline-flex items-center justify-center w-6 h-6 bg-[#d4a348] text-white text-xs font-bold rounded-full">
            {requests.length}
          </span>
        </h3>
      </div>

      {mutualRequests.length > 0 && (
        <div className="mb-4 p-3 bg-[#c97a2a]/10 border border-[#c97a2a] rounded-lg">
          <p className="text-sm text-[#1a0f0a]">
            ✓ <strong>{mutualRequests.length}</strong> mutual match{mutualRequests.length !== 1 ? 'es' : ''} waiting! Accept to confirm your connection.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {requests.map((request) => {
          const isMutual = currentUserId && checkMutualRequest(currentUserId, request.fromUserId);
          return (
            <div
              key={request.id}
              className={`flex flex-col rounded-lg overflow-hidden border-2 transition-colors ${
                isMutual
                  ? "border-[#c97a2a] bg-[#c97a2a]/5"
                  : "border-[#e8ddd2] bg-white hover:border-[#d4a348]"
              }`}
            >
              {/* Profile Photo */}
              {request.fromUserPhoto && (
                <button
                  onClick={() => handleViewProfile(request)}
                  className="relative hover:opacity-90 transition-opacity flex-shrink-0"
                >
                  <img
                    src={request.fromUserPhoto}
                    alt={request.fromUserName}
                    className="w-full aspect-square object-cover"
                  />
                  {isMutual && (
                    <div className="absolute top-2 right-2 bg-[#c97a2a] text-white px-2 py-1 rounded-full text-xs font-bold">
                      Mutual!
                    </div>
                  )}
                </button>
              )}

              {/* Name */}
              <div className="p-3">
                <button
                  onClick={() => handleViewProfile(request)}
                  className="font-medium text-[#1a0f0a] text-sm line-clamp-2 text-center mb-3 w-full hover:text-[#d4a348] transition-colors"
                >
                  {request.fromUserName}
                </button>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 mt-auto">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onAccept(request.id)}
                    className="flex-1"
                  >
                    Accept
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDecline(request.id)}
                    className="flex-1"
                  >
                    Decline
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Profile Modal */}
      {selectedProfile && (
        <ConnectionProfileModal
          profile={selectedProfile}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </Card>
  );
}
