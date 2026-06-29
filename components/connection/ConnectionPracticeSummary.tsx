"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { SkeletonCard } from "@/components/Skeleton";
import {
  getConnectionPracticeSummary,
  getConnectionMilestones,
} from "@/lib/data/connection-practice";
import { getProfile } from "@/lib/data/profiles";
import { connectionPracticeCopy } from "@/lib/content/connection-practices";
import { withTimeout } from "@/lib/utils/with-timeout";

interface ConnectionPracticeSummaryProps {
  postCount?: number;
  commentCount?: number;
  commentsOffered?: number;
  spacesJoinedCount?: number;
  monthlyIntention?: string;
  statsLoading?: boolean;
}

export function ConnectionPracticeSummary({
  postCount = 0,
  commentCount = 0,
  commentsOffered = 0,
  spacesJoinedCount = 0,
  monthlyIntention,
  statsLoading = false,
}: ConnectionPracticeSummaryProps) {
  const [milestones, setMilestones] = useState<any[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(true);

  useEffect(() => {
    const loadMilestones = async () => {
      try {
        const profile = await getProfile();
        if (profile) {
          const m = await withTimeout(getConnectionMilestones(profile.id), 4000, []);
          setMilestones(m);
        }
      } catch (error) {
        console.warn("Error loading milestones:", error);
      } finally {
        setMilestonesLoading(false);
      }
    };

    loadMilestones();
  }, []);

  // Show skeleton while stats are loading
  if (statsLoading) {
    return <SkeletonCard lines={4} />;
  }

  const stats = [
    { label: "Reflections shared", value: postCount },
    { label: "Responses received", value: commentCount },
    { label: "Comments offered", value: commentsOffered },
    { label: "Spaces joined", value: spacesJoinedCount },
  ];

  return (
    <Card className="bg-gradient-to-br from-[#f8f6f2] to-white">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-[#1a0f0a]">
            Your Connection Practice
          </h3>
          <p className="text-sm text-[#1a0f0a] mt-2 italic">{connectionPracticeCopy}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="px-4 py-3 rounded-lg bg-white border border-[#e8ddd2]"
            >
              <p className="text-2xl font-semibold text-[#d4a348]">{stat.value}</p>
              <p className="text-xs text-[#1a0f0a] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Monthly Intention */}
        {monthlyIntention && (
          <div className="px-4 py-3 rounded-lg bg-[#f3ede5] border-l-4 border-[#c97a2a]">
            <p className="text-xs font-medium text-[#c97a2a] uppercase tracking-wide mb-1">
              This Month's Intention
            </p>
            <p className="text-sm text-[#1a0f0a]">{monthlyIntention}</p>
          </div>
        )}

        {/* Milestones */}
        {!milestonesLoading && milestones.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#c97a2a] uppercase tracking-wide">
              Connection Milestones
            </p>
            <div className="space-y-2">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="px-4 py-2 rounded-lg bg-[#f3ede5] border-l-2 border-[#d4a348]"
                >
                  <p className="text-sm font-medium text-[#1a0f0a]">
                    {milestone.milestoneType
                      .split("-")
                      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")}
                  </p>
                  <p className="text-xs text-[#a0704a] mt-1">
                    Earned {new Date(milestone.earnedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        <div className="pt-4 border-t border-[#e8ddd2]">
          <p className="text-xs text-[#a0704a] leading-relaxed">
            <strong>Connection is not comparing.</strong> Your practice is unique to you. What matters is
            showing up, being honest, and witnessing others with care.
          </p>
        </div>
      </div>
    </Card>
  );
}
