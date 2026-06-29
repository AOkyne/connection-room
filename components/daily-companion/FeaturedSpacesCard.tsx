"use client";

import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import Link from "next/link";
import { SpaceIconSVG } from "@/components/SpaceIconSVG";

interface FeaturedSpace {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isJoined: boolean;
}

interface FeaturedSpacesCardProps {
  spaces: FeaturedSpace[];
}

// Curated featured spaces for v1.3
const FEATURED_SPACE_IDS = [
  "commons",
  "touch-affection",
  "couples",
  "spirituality-sexuality",
  "dating-desire",
];

export function FeaturedSpacesCard({ spaces }: FeaturedSpacesCardProps) {
  const featuredSpaces = spaces.filter((s) => FEATURED_SPACE_IDS.includes(s.id)).slice(0, 5);

  if (featuredSpaces.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#1a0f0a]">Featured Spaces</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {featuredSpaces.map((space) => (
          <Card key={space.id} className={`${space.color} border-l-4 border-[#d4a348]`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <SpaceIconSVG spaceId={space.id} size={16} />
                  <p className="text-sm font-semibold text-[#1a0f0a]">{space.name}</p>
                </div>
                <p className="text-xs text-[#1a0f0a] line-clamp-2">{space.description}</p>
              </div>
              <Link href={`/app/spaces/${space.id}`} className="flex-shrink-0">
                <Button variant={space.isJoined ? "outline" : "primary"} size="sm">
                  {space.isJoined ? "Visit" : "Join"}
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
      <Link href="/app/spaces" className="inline-block">
        <Button variant="outline" size="sm">
          Explore All Spaces
        </Button>
      </Link>
    </div>
  );
}
