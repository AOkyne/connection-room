"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { SpaceIconSVG } from "@/components/SpaceIconSVG";
import { getSpaces, joinSpace, leaveSpace, type Space } from "@/lib/data/spaces";

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);

  useEffect(() => {
    const loadSpaces = async () => {
      const s = await getSpaces();
      setSpaces(s);
    };

    loadSpaces();
  }, []);

  const handleJoinSpace = async (spaceId: string) => {
    await joinSpace(spaceId);
    const s = await getSpaces();
    setSpaces(s);
  };

  const handleLeaveSpace = async (spaceId: string) => {
    await leaveSpace(spaceId);
    const s = await getSpaces();
    setSpaces(s);
  };

  const joinedSpaces = spaces.filter((s) => s.isJoined);
  const availableSpaces = spaces.filter((s) => !s.isJoined);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-[#2a2318]">Community Spaces</h1>
        <p className="text-lg text-[#6b5f52] mt-2">
          Choose spaces that resonate with your practice
        </p>
      </div>

      {/* Joined Spaces */}
      {joinedSpaces.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-[#2a2318]">Your Spaces</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {joinedSpaces.map((space) => (
              <Card key={space.id}>
                <CardHeader title={space.name} icon={<SpaceIconSVG spaceId={space.id} size={32} />} />
                <p className="text-sm text-[#6b5f52] mb-4">{space.description}</p>
                <div className="text-xs text-[#a0968a] mb-4">{space.memberCount} members</div>
                <div className="flex gap-2">
                  <Link href={`/app/spaces/${space.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      Enter Space
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLeaveSpace(space.id)}
                  >
                    Leave
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Spaces */}
      {availableSpaces.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-[#2a2318]">Explore More Spaces</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableSpaces.map((space) => (
              <Card key={space.id}>
                <CardHeader title={space.name} icon={<SpaceIconSVG spaceId={space.id} size={32} />} />
                <p className="text-sm text-[#6b5f52] mb-4">{space.description}</p>
                <div className="text-xs text-[#a0968a] mb-4">{space.memberCount} members</div>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => handleJoinSpace(space.id)}
                >
                  Join Space
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
