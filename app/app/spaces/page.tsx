"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { SpaceIconSVG } from "@/components/SpaceIconSVG";
import { SpaceJoinedFeedback } from "@/components/feedback";
import { Breadcrumb } from "@/components/Breadcrumb";
import { getSpaces, joinSpace, leaveSpace, ensureRequiredSpaces, sortSpacesByPreference, saveSpaceOrder, isStartHereRequired, getAppVisits, type Space } from "@/lib/data/spaces";
import { getMemberCountBySpace } from "@/lib/data/profiles";
import { spaceImageMap } from "@/lib/constants/spaceImages";

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [draggedSpace, setDraggedSpace] = useState<string | null>(null);
  const [joinedSpaceFeedback, setJoinedSpaceFeedback] = useState<{ spaceName: string; spaceId: string } | null>(null);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadSpaces = async () => {
      // Ensure user has joined required spaces
      await ensureRequiredSpaces();

      const s = await getSpaces();
      const sorted = sortSpacesByPreference(s);
      setSpaces(sorted);

      // Load member counts for each space
      const counts: Record<string, number> = {};
      for (const space of sorted) {
        counts[space.id] = await getMemberCountBySpace(space.id);
      }
      setMemberCounts(counts);
    };

    loadSpaces();
  }, []);

  const handleJoinSpace = async (spaceId: string) => {
    await joinSpace(spaceId);
    const s = await getSpaces();
    const space = s.find(sp => sp.id === spaceId);
    if (space) {
      setJoinedSpaceFeedback({ spaceName: space.name, spaceId: space.id });
    }
    setSpaces(s);
  };

  const handleLeaveSpace = async (spaceId: string) => {
    // Prevent leaving The Commons (always required)
    if (spaceId === "commons") {
      alert("You cannot leave The Commons");
      return;
    }

    // Prevent leaving Start Here if still required
    if (spaceId === "start-here" && isStartHereRequired()) {
      alert("You must complete Start Here before leaving");
      return;
    }

    await leaveSpace(spaceId);
    const s = await getSpaces();
    const sorted = sortSpacesByPreference(s);
    setSpaces(sorted);
  };

  const handleDragStart = (spaceId: string) => {
    setDraggedSpace(spaceId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetSpaceId: string) => {
    if (!draggedSpace || draggedSpace === targetSpaceId) {
      setDraggedSpace(null);
      return;
    }

    const joinedSpaces = spaces.filter((s) => s.isJoined);
    const draggedIndex = joinedSpaces.findIndex((s) => s.id === draggedSpace);
    const targetIndex = joinedSpaces.findIndex((s) => s.id === targetSpaceId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedSpace(null);
      return;
    }

    // Create new order
    const newJoinedSpaces = [...joinedSpaces];
    const [movedSpace] = newJoinedSpaces.splice(draggedIndex, 1);
    newJoinedSpaces.splice(targetIndex, 0, movedSpace);

    // Save new order (only the non-required spaces)
    const orderedIds = newJoinedSpaces.filter(s => !["start-here", "commons"].includes(s.id)).map(s => s.id);
    saveSpaceOrder(orderedIds);

    // Update state with new order
    const availableSpaces = spaces.filter((s) => !s.isJoined);
    const updatedSpaces = [...newJoinedSpaces, ...availableSpaces];
    setSpaces(updatedSpaces);
    setDraggedSpace(null);
  };

  const joinedSpaces = spaces.filter((s) => s.isJoined);
  const availableSpaces = spaces.filter((s) => !s.isJoined);

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: "Home", href: "/app" },
          { label: "Community Spaces", isActive: true },
        ]}
      />

      {/* Feedback for joining a space */}
      {joinedSpaceFeedback && (
        <SpaceJoinedFeedback
          spaceName={joinedSpaceFeedback.spaceName}
          spaceId={joinedSpaceFeedback.spaceId}
          onClose={() => setJoinedSpaceFeedback(null)}
        />
      )}

      <div>
        <h1 className="text-4xl font-bold text-[#1a0f0a]">Community Spaces</h1>
        <p className="text-lg text-[#1a0f0a] mt-2">
          Choose spaces that resonate with your practice
        </p>
      </div>

      {/* Joined Spaces */}
      {joinedSpaces.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-[#1a0f0a]">Your Spaces</h2>
            <p className="text-sm text-[#a0704a] mt-1">Drag to reorder your spaces</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {joinedSpaces.map((space) => {
              const isCommons = space.id === "commons";
              const isStartHereStillRequired = space.id === "start-here" && isStartHereRequired();
              const isRequired = isCommons || isStartHereStillRequired;
              const visitsRemaining = space.id === "start-here" ? Math.max(0, 5 - getAppVisits()) : null;

              return (
                <div
                  key={space.id}
                  draggable={!isRequired}
                  onDragStart={() => handleDragStart(space.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(space.id)}
                  className={`transition-opacity ${draggedSpace === space.id ? "opacity-50" : ""} ${!isRequired ? "cursor-move" : ""}`}
                >
                  <Card className="overflow-hidden flex flex-col h-full">
                    {/* Hero Image */}
                    <div className="relative w-full h-40 -m-4 mb-2 overflow-hidden rounded-t-lg">
                      <Image
                        src={`/imagery/spaces/${spaceImageMap[space.id] || "The Commons.png"}`}
                        alt={space.name}
                        fill
                        className="object-cover object-top"
                      />
                    </div>

                    {isRequired && (
                      <div className="text-xs font-medium text-[#c97a2a] mb-2 flex items-center gap-1">
                        <span>✓ Required</span>
                        {space.id === "start-here" && (
                          <span className="text-[#a0704a]">({visitsRemaining} visits left)</span>
                        )}
                      </div>
                    )}
                    {space.id === "start-here" && !isStartHereRequired && (
                      <div className="text-xs font-medium text-[#c97a2a] mb-2 flex items-center gap-1">
                        <span>✓ Complete</span>
                      </div>
                    )}
                    <CardHeader title={space.name} icon={<SpaceIconSVG spaceId={space.id} size={32} />} />
                    <p className="text-sm text-[#1a0f0a] mb-4">{space.description}</p>
                    <div className="text-xs text-[#a0704a] mb-4">{memberCounts[space.id] || 0} members</div>
                    <div className="flex gap-2 mt-auto">
                      <Link href={`/app/spaces/${space.id}`}>
                        <Button variant="secondary" size="sm">
                          Enter Space
                        </Button>
                      </Link>
                      {!isRequired && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLeaveSpace(space.id)}
                        >
                          Leave
                        </Button>
                      )}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Spaces */}
      {availableSpaces.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-[#1a0f0a]">Explore More Spaces</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableSpaces.map((space) => (
              <Card key={space.id} className="overflow-hidden flex flex-col h-full">
                {/* Hero Image */}
                <div className="relative w-full h-40 -m-4 mb-2 overflow-hidden rounded-t-lg">
                  <Image
                    src={`/imagery/spaces/${spaceImageMap[space.id] || "The Commons.png"}`}
                    alt={space.name}
                    fill
                    className="object-cover object-top"
                  />
                </div>

                <CardHeader title={space.name} icon={<SpaceIconSVG spaceId={space.id} size={32} />} />
                <p className="text-sm text-[#1a0f0a] mb-4">{space.description}</p>
                <div className="text-xs text-[#a0704a] mb-4">{memberCounts[space.id] || 0} members</div>
                <div className="mt-auto">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleJoinSpace(space.id)}
                  >
                    Join Space
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
