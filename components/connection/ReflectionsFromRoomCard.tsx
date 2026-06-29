"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import Link from "next/link";

interface RecentReflection {
  id: string;
  spaceId: string;
  spaceName: string;
  title: string;
  excerpt: string;
  authorName: string;
  authorPhoto?: string;
  createdAt: Date;
}

interface ReflectionsFromRoomCardProps {
  recentReflections?: RecentReflection[];
  isLoading?: boolean;
}

const MAX_VISIBLE = 3;

export function ReflectionsFromRoomCard({
  recentReflections = [],
  isLoading = false,
}: ReflectionsFromRoomCardProps) {
  const hasReflections = recentReflections.length > 0;
  const visibleReflections = recentReflections.slice(0, MAX_VISIBLE);
  const hasMore = recentReflections.length > MAX_VISIBLE;

  return (
    <Card className="bg-gradient-to-br from-[#f3ede5] to-white">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-[#1a0f0a]">
            Reflections from the Room
          </h3>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-6 text-center">
            <p className="text-sm text-[#1a0f0a]">Loading reflections...</p>
          </div>
        ) : hasReflections ? (
          <div className="space-y-3">
            {visibleReflections.map((reflection) => (
              <div
                key={reflection.id}
                className="px-4 py-3 rounded-lg bg-white border border-[#e8ddd2] hover:border-[#d4a348] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#c97a2a] uppercase tracking-wide">
                      {reflection.spaceName}
                    </p>
                    <p className="text-sm font-medium text-[#1a0f0a] mt-1 line-clamp-2">
                      {reflection.title}
                    </p>
                    <p className="text-xs text-[#1a0f0a] mt-1 line-clamp-2">
                      {reflection.excerpt}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {reflection.authorPhoto && (
                        <img
                          src={reflection.authorPhoto}
                          alt={reflection.authorName}
                          className="w-5 h-5 rounded-full object-cover border border-[#e8ddd2]"
                        />
                      )}
                      <p className="text-xs text-[#a0704a]">
                        — {reflection.authorName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {hasMore && (
              <Link href="/app/spaces/commons" className="block pt-2">
                <p className="text-xs text-[#d4a348] font-medium hover:underline">
                  +{recentReflections.length - MAX_VISIBLE} more reflections →
                </p>
              </Link>
            )}
          </div>
        ) : (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-[#1a0f0a]">
              The room is still forming.
            </p>
            <p className="text-sm text-[#1a0f0a] leading-relaxed">
              Your reflection can help set the tone for the members who arrive
              after you.
            </p>
            <a
              href="/app/spaces/commons"
              className="inline-block px-4 py-2 bg-[#d4a348] rounded-lg text-sm font-medium hover:bg-[#c09560] transition-colors"
              style={{ color: "white" }}
            >
              Start a Reflection
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}
