"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import {
  getConnectionPracticeSummary,
  getConnectionMilestones,
} from "@/lib/data/connection-practice";
import { getProfile } from "@/lib/data/profiles";
import { connectionPracticeCopy } from "@/lib/content/connection-practices";

interface ConnectionPracticeSummaryProps {
  postCount?: number;
  commentCount?: number;
  commentsOffered?: number;
  spacesJoinedCount?: number;
  monthlyIntention?: string;
}

export function ConnectionPracticeSummary({
  postCount = 0,
  commentCount = 0,
  commentsOffered = 0,
  spacesJoinedCount = 0,
  monthlyIntention,
}: ConnectionPracticeSummaryProps) {
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMilestones = async () => {
      try {
        const profile = await getProfile();
        if (profile) {
          const m = await getConnectionMilestones(profile.id);
          setMilestones(m);
        }
      } catch (error) {
        console.error("Error loading milestones:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMilestones();
  }, []);

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
          <h3 className="text-lg font-semibold text-[#2a2318]">
            Your Connection Practice
          </h3>
          <p className="text-sm text-[#6b5f52] mt-2 italic">{connectionPracticeCopy}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="px-4 py-3 rounded-lg bg-white border border-[#e8ddd2]"
            >
              <p className="text-2xl font-semibold text-[#d4a574]">{stat.value}</p>
              <p className="text-xs text-[#6b5f52] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Monthly Intention */}
        {monthlyIntention && (
          <div className="px-4 py-3 rounded-lg bg-[#f3ede5] border-l-4 border-[#8fa878]">
            <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide mb-1">
              This Month's Intention
            </p>
            <p className="text-sm text-[#6b5f52]">{monthlyIntention}</p>
          </div>
        )}

        {/* Milestones */}
        {!loading && milestones.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide">
              Connection Milestones
            </p>
            <div className="space-y-2">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="px-4 py-2 rounded-lg bg-[#f3ede5] border-l-2 border-[#d4a574]"
                >
                  <p className="text-sm font-medium text-[#2a2318]">
                    {milestone.milestoneType
                      .split("-")
                      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")}
                  </p>
                  <p className="text-xs text-[#a0968a] mt-1">
                    Earned {new Date(milestone.earnedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        <div className="pt-4 border-t border-[#e8ddd2]">
          <p className="text-xs text-[#a0968a] leading-relaxed">
            <strong>Connection is not comparing.</strong> Your practice is unique to you. What matters is
            showing up, being honest, and witnessing others with care.
          </p>
        </div>
      </div>
    </Card>
  );
}
