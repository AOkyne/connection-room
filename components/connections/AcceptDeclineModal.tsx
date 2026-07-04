"use client";

import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { type ConnectionRequest } from "@/lib/data/connectionRequests";

interface AcceptDeclineModalProps {
  request: ConnectionRequest;
  onAccept: () => void;
  onDecline: () => void;
}

export function AcceptDeclineModal({
  request,
  onAccept,
  onDecline,
}: AcceptDeclineModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="space-y-4">
          {/* User Info */}
          <div className="text-center space-y-3">
            {request.fromUserPhoto && (
              <img
                src={request.fromUserPhoto}
                alt={request.fromUserName}
                className="w-24 h-24 rounded-full mx-auto object-cover"
              />
            )}
            <div>
              <h2 className="text-xl font-semibold text-[#1a0f0a]">
                {request.fromUserName}
              </h2>
              <p className="text-sm text-[#a0704a] mt-1">wants to connect</p>
            </div>
          </div>

          {/* Interests */}
          {request.fromUserInterests && request.fromUserInterests.length > 0 && (
            <div className="bg-[#f3ede5] rounded-lg p-3">
              <p className="text-xs font-medium text-[#c97a2a] uppercase tracking-wide mb-2">
                Their Interests
              </p>
              <div className="flex flex-wrap gap-1">
                {request.fromUserInterests.slice(0, 4).map((interest) => (
                  <span
                    key={interest}
                    className="inline-block bg-[#e8ddd2] text-[#1a0f0a] px-2 py-1 rounded text-xs"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prompt */}
          {request.sharedPrompt && (
            <div className="bg-[#f8f6f2] rounded-lg p-3 border-l-4 border-[#d4a348]">
              <p className="text-xs text-[#c97a2a] font-medium mb-2">Conversation Starter</p>
              <p className="text-sm text-[#1a0f0a] italic">"{request.sharedPrompt}"</p>
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-[#1a0f0a] text-center">
            Accept to start a 20-minute conversation. You'll be able to chat and use a timer.
          </p>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-[#e8ddd2]">
            <Button
              variant="outline"
              size="md"
              className="flex-1"
              onClick={onDecline}
            >
              Decline
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={onAccept}
            >
              Accept
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
