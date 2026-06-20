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
    <Card className="bg-gradient-to-br from-[#d4a574]/5 to-[#8fa878]/5 border-l-4 border-[#d4a574]">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#2a2318]">
            Share in Community
          </h3>
          <p className="text-xs text-[#8fa878] font-medium uppercase tracking-wide mt-1">
            Week: {title}
          </p>
        </div>

        <p className="text-sm text-[#6b5f52] leading-relaxed">
          {invitation}
        </p>

        <div className="space-y-2">
          <p className="text-xs text-[#a0968a] italic">
            No pressure to share. This is an invitation, not a requirement.
          </p>
          <Button
            onClick={onShare}
            variant="secondary"
            size="sm"
            className="w-full"
          >
            Create a Post in The Commons
          </Button>
        </div>
      </div>
    </Card>
  );
}
