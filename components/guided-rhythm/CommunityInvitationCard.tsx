"use client";

import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface CommunityInvitationCardProps {
  title: string;
  invitation: string;
  onShare: () => void;
}

export function CommunityInvitationCard({
  title,
  invitation,
  onShare,
}: CommunityInvitationCardProps) {
  return (
    <Card className="bg-gradient-to-br from-[#d4a348]/5 to-[#c97a2a]/5 border-l-4 border-[#d4a348]">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#1a0f0a]">
            Share in Community
          </h3>
          <p className="text-xs text-[#c97a2a] font-medium uppercase tracking-wide mt-1">
            Week: {title}
          </p>
        </div>

        <p className="text-sm text-[#1a0f0a] leading-relaxed">
          {invitation}
        </p>

        <div className="space-y-2">
          <p className="text-xs text-[#a0704a] italic">
            No pressure to share. This is an invitation, not a requirement.
          </p>
          <Button
            onClick={onShare}
            variant="secondary"
            size="md"
          >
            Create a Post in The Commons
          </Button>
        </div>
      </div>
    </Card>
  );
}
