"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { getConnectionSuggestions, dismissSuggestion, type ConnectionSuggestion } from "@/lib/data/connectionsDirect";
import { trackConnectionEvent } from "@/lib/analytics/connectionEvents";

interface SomeoneYouMightWantToKnowProps {
  // Where this is rendered -- reserved for future per-surface copy/styling
  // differences (dashboard, home feed, weekly digest) without changing
  // the component's actual data or behavior.
  context?: string;
  weekly?: boolean;
  onSayHello: (member: ConnectionSuggestion) => void;
}

// Reusable recommendation widget -- same component whether it's showing
// the general "Someone You Might Want to Know" list or the single "Your
// Connection of the Week" pick (weekly=true). Renders nothing at all if
// there's no eligible suggestion, rather than an empty-state card -- this
// is meant to feel like a quiet, occasional nudge, not another thing
// demanding the member's attention every time the list is empty.
export function SomeoneYouMightWantToKnow({ weekly = false, onSayHello }: SomeoneYouMightWantToKnowProps) {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConnectionSuggestions(weekly).then((result) => {
      setSuggestions(result.suggestions);
      setLoading(false);
      for (const s of result.suggestions) {
        trackConnectionEvent({ eventType: "suggested_member_shown", relatedUserId: s.id });
      }
    });
  }, [weekly]);

  const handleDismiss = async (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    trackConnectionEvent({ eventType: "suggested_member_dismissed", relatedUserId: id });
    await dismissSuggestion(id);
  };

  const handleSayHello = (member: ConnectionSuggestion) => {
    trackConnectionEvent({ eventType: "suggested_member_messaged", relatedUserId: member.id });
    onSayHello(member);
  };

  if (loading || suggestions.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-[#f3ede5] to-[#fffbf7] border-[#d4a348]">
      <CardHeader title={weekly ? "Your Connection of the Week" : "Someone You Might Want to Know"} />
      <div className="space-y-4">
        {suggestions.map((s) => (
          <div key={s.id} className="flex items-start gap-3">
            <Avatar name={s.displayName} photo={s.profilePhoto} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#1a0f0a]">{s.displayName}</p>
              <p className="text-sm text-[#1a0f0a]">{s.reason}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Link
                  href={`/app/users/${s.id}`}
                  onClick={() => trackConnectionEvent({ eventType: "member_profile_opened_from_connections", relatedUserId: s.id })}
                >
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                </Link>
                <Button variant="primary" size="sm" onClick={() => handleSayHello(s)}>
                  👋 Say Hello
                </Button>
                {weekly && (
                  <Button variant="ghost" size="sm" onClick={() => handleDismiss(s.id)}>
                    Not this one
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
