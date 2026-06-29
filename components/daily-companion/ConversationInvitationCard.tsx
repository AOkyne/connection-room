"use client";

import { DailyContent } from "@/lib/data/daily-companion";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import Link from "next/link";

interface ConversationInvitationCardProps {
  invitation: DailyContent | null;
}

export function ConversationInvitationCard({ invitation }: ConversationInvitationCardProps) {
  if (!invitation) return null;

  return (
    <Card className="border-l-4 border-[#c9a876] bg-white">
      <div className="space-y-4">
        <p className="text-xs font-semibold text-[#8fa878] uppercase tracking-wide">
          Conversation Invitation
        </p>
        <p className="text-sm text-[#2a2318] leading-relaxed">{invitation.body}</p>
        <div className="flex gap-2">
          <Link href="/app/spaces/commons" className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              Visit The Commons
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
