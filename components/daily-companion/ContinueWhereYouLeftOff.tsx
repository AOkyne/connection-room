"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import Link from "next/link";
import type { Profile } from "@/lib/data/profiles";

interface ContinueWhereYouLeftOffProps {
  profile: Profile | null;
  recentReflections?: any[];
  upcomingEvents?: any[];
}

export function ContinueWhereYouLeftOff({
  profile,
  recentReflections,
  upcomingEvents,
}: ContinueWhereYouLeftOffProps) {
  const [items, setItems] = useState<Array<{ title: string; description: string; href?: string; action?: string }>>([]);

  useEffect(() => {
    const continuationItems: Array<{ title: string; description: string; href?: string; action?: string }> = [];

    // Last reflection
    if (recentReflections && recentReflections.length > 0) {
      const lastReflection = recentReflections[0];
      continuationItems.push({
        title: "Your Last Reflection",
        description: `"${lastReflection.prompt_text?.substring(0, 60)}..."`,
        href: "#reflections",
        action: "View",
      });
    }

    // Check onboarding status
    if (profile && !profile.completedOnboarding) {
      continuationItems.push({
        title: "Complete Your Onboarding",
        description: "You're partway through the Seven Doors. Keep going.",
        href: "/app/journey",
        action: "Continue",
      });
    }

    // Recently visited spaces
    if (profile && profile.spacesJoined && profile.spacesJoined.length > 0) {
      continuationItems.push({
        title: "Your Spaces",
        description: `${profile.spacesJoined.length} space${profile.spacesJoined.length > 1 ? "s" : ""} you're part of`,
        href: "/app/spaces",
        action: "Visit",
      });
    }

    // Upcoming events
    if (upcomingEvents && upcomingEvents.length > 0) {
      const nextEvent = upcomingEvents[0];
      continuationItems.push({
        title: `Upcoming: ${nextEvent.title}`,
        description: nextEvent.date ? new Date(nextEvent.date).toLocaleDateString() : "Check details",
        href: "#events",
        action: "RSVP",
      });
    }

    setItems(continuationItems);
  }, [profile, recentReflections, upcomingEvents]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-[#2a2318]">Continue Where You Left Off</h3>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((item, idx) => (
          <Card key={idx} className="bg-white hover:bg-[#f8f6f2] transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#2a2318]">{item.title}</p>
                <p className="text-xs text-[#6b5f52] mt-1 line-clamp-2">{item.description}</p>
              </div>
              {item.href && (
                <Link href={item.href} className="flex-shrink-0">
                  <button className="text-xs font-semibold text-[#d4a574] hover:text-[#c09560] whitespace-nowrap">
                    {item.action}
                  </button>
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
