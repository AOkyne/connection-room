"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getJourneyProgress, ensureJourneyExists } from "@/lib/data/first-week-journey";
import { Card } from "@/components/Card";

export function FirstWeekDashboardCard() {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    try {
      await ensureJourneyExists();
      const p = await getJourneyProgress();
      setProgress(p);
    } catch (error) {
      console.error("Error loading journey progress:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return null;
  }

  if (!progress) {
    return null;
  }

  const completionPercentage = Math.round(
    (progress.completedDoors.length / 7) * 100
  );
  const isComplete = progress.completedDoors.length === 7;

  return (
    <Link href="/app/journey">
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[#2a2318]">
              The Seven Doors of Connection
            </h3>
            <p className="text-xs text-[#8fa878] font-medium uppercase tracking-wide">
              Your First Week Journey
            </p>
          </div>

          {isComplete ? (
            <div className="space-y-2 bg-[#f3ede5] rounded-lg p-3">
              <p className="text-sm font-medium text-[#8fa878]">
                ✓ Journey Complete
              </p>
              <p className="text-xs text-[#6b5f52]">
                You've finished the first week. Now continue exploring the community.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6b5f52]">
                  {progress.completedDoors.length} of 7 doors complete
                </span>
                <span className="text-[#d4a574] font-medium">
                  {completionPercentage}%
                </span>
              </div>
              <div className="w-full h-2 bg-[#e8ddd2] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#d4a574] to-[#8fa878] transition-all"
                  style={{
                    width: `${completionPercentage}%`,
                  }}
                />
              </div>

              <p className="text-xs text-[#6b5f52] leading-relaxed">
                {progress.currentDoor <= 7 ? (
                  <>
                    Next: <strong>Door {progress.currentDoor}</strong>
                  </>
                ) : (
                  "You've completed all doors"
                )}
              </p>
            </div>
          )}

          <button className="text-sm text-[#d4a574] hover:text-[#8fa878] font-medium pt-2">
            {isComplete ? "View Your Journey" : "Continue"}
            →
          </button>
        </div>
      </Card>
    </Link>
  );
}
