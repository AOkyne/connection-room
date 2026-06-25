"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { withTimeout } from "@/lib/utils/with-timeout";
import { guidedRhythm } from "@/lib/content/guided-rhythm";
import {
  getCurrentMonthAndWeek,
  ensureGuidedRhythmExists,
} from "@/lib/data/guided-rhythm";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

export function MonthlyDashboardCard() {
  const [loading, setLoading] = useState(true);
  const { month, week } = getCurrentMonthAndWeek();
  const currentMonth = guidedRhythm.find((m) => m.monthNumber === month);
  const currentWeek = currentMonth?.weeks.find((w) => w.weekNumber === week);

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    try {
      await withTimeout(ensureGuidedRhythmExists(), 3000, undefined);
    } catch (error) {
      console.warn("Error loading guided rhythm:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !currentMonth || !currentWeek) {
    return null;
  }

  return (
    <Link href="/app/journey">
      <Card className="hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-[#f3ede5] to-[#f8f6f2]">
        <div className="space-y-4">
          {/* Header */}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[#2a2318]">
              This Month in The Connection Room
            </h3>
            <p className="text-xs text-[#d4a574] font-medium uppercase tracking-wide">
              {currentMonth.title}
            </p>
          </div>

          {/* Theme Summary */}
          <p className="text-sm text-[#6b5f52] leading-relaxed line-clamp-2">
            {currentMonth.monthlyTheme}
          </p>

          {/* Current Week */}
          <div className="bg-white rounded-lg p-3 border-l-4 border-[#d4a574]">
            <p className="text-xs text-[#8fa878] font-medium uppercase tracking-wide mb-1">
              This Week: {currentWeek.title}
            </p>
            <p className="text-sm text-[#6b5f52] italic">
              {currentWeek.dashboardPrompt}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              variant="secondary"
              size="sm"
              className="w-full text-left"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = "/app/journey";
              }}
            >
              Explore Your Rhythm
            </Button>
          </div>

          {/* Microcopy */}
          <p className="text-xs text-[#a0968a] italic">
            This is a rhythm, not a requirement. Return when you can.
          </p>
        </div>
      </Card>
    </Link>
  );
}
