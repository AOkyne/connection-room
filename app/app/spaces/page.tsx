"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { SpaceIconSVG } from "@/components/SpaceIconSVG";
import { getSpaces, joinSpace, leaveSpace, ensureRequiredSpaces, sortSpacesByPreference, saveSpaceOrder, type Space } from "@/lib/data/spaces";

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [draggedSpace, setDraggedSpace] = useState<string | null>(null);

  useEffect(() => {
    const loadSpaces = async () => {
      // Ensure user has joined required spaces
      await ensureRequiredSpaces();

      const s = await getSpaces();
      const sorted = sortSpacesByPreference(s);
      setSpaces(sorted);
    };

    loadSpaces();
  }, []);

  const handleJoinSpace = async (spaceId: string) => {
    await joinSpace(spaceId);
    const s = await getSpaces();
    setSpaces(s);
  };

  const handleLeaveSpace = async (spaceId: string) => {
    // Prevent leaving required spaces
    if (["start-here", "commons"].includes(spaceId)) {
      alert("You cannot leave this required space");
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
      <div>
        <h1 className="text-4xl font-bold text-[#2a2318]">Community Spaces</h1>
        <p className="text-lg text-[#6b5f52] mt-2">
          Choose spaces that resonate with your practice
        </p>
      </div>

      {/* Joined Spaces */}
      {joinedSpaces.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-[#2a2318]">Your Spaces</h2>
            <p className="text-sm text-[#a0968a] mt-1">Drag to reorder your spaces</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {joinedSpaces.map((space) => {
              const isRequired = ["start-here", "commons"].includes(space.id);
              return (
                <div
                  key={space.id}
                  draggable={!isRequired}
                  onDragStart={() => handleDragStart(space.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(space.id)}
                  className={`transition-opacity ${draggedSpace === space.id ? "opacity-50" : ""} ${!isRequired ? "cursor-move" : ""}`}
                >
                  <Card>
                    {isRequired && (
                      <div className="text-xs font-medium text-[#8fa878] mb-2 flex items-center gap-1">
                        <span>✓ Required</span>
                      </div>
                    )}
                    <CardHeader title={space.name} icon={<SpaceIconSVG spaceId={space.id} size={32} />} />
                    <p className="text-sm text-[#6b5f52] mb-4">{space.description}</p>
                    <div className="text-xs text-[#a0968a] mb-4">{space.memberCount} members</div>
                    <div className="flex gap-2">
                      <Link href={`/app/spaces/${space.id}`} className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full">
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
