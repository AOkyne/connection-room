"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";

interface RecentReflection {
  id: string;
  spaceId: string;
  spaceName: string;
  title: string;
  excerpt: string;
  authorName: string;
  createdAt: Date;
}

interface ReflectionsFromRoomCardProps {
  recentReflections?: RecentReflection[];
  isLoading?: boolean;
}

export function ReflectionsFromRoomCard({
  recentReflections = [],
  isLoading = false,
}: ReflectionsFromRoomCardProps) {
  const hasReflections = recentReflections.length > 0;

  return (
    <Card className="bg-gradient-to-br from-[#f3ede5] to-white">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-[#2a2318]">
            Reflections from the Room
          </h3>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-6 text-center">
            <p className="text-sm text-[#6b5f52]">Loading reflections...</p>
          </div>
        ) : hasReflections ? (
          <div className="space-y-3">
            {recentReflections.map((reflection) => (
              <div
                key={reflection.id}
                className="px-4 py-3 rounded-lg bg-white border border-[#e8ddd2] hover:border-[#d4a574] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide">
                      {reflection.spaceName}
                    </p>
                    <p className="text-sm font-medium text-[#2a2318] mt-1 line-clamp-2">
                      {reflection.title}
                    </p>
                    <p className="text-xs text-[#6b5f52] mt-1 line-clamp-2">
                      {reflection.excerpt}
                    </p>
                    <p className="text-xs text-[#a0968a] mt-2">
                      — {reflection.authorName}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-[#6b5f52]">
              The room is still forming.
            </p>
            <p className="text-sm text-[#6b5f52] leading-relaxed">
              Your reflection can help set the tone for the members who arrive
              after you.
            </p>
            <a
              href="/app/spaces/commons"
              className="inline-block px-4 py-2 bg-[#d4a574] rounded-lg text-sm font-medium hover:bg-[#c09560] transition-colors"
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
