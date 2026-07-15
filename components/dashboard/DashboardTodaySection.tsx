/**
 * DashboardTodaySection
 *
 * The primary, above-the-fold dashboard section.
 * Shows the daily companion experience for today.
 *
 * Includes:
 * - Daily theme, reflection, practice, body check-in, conversation
 * - Quote of the day
 * - Hero image
 *
 * Props:
 * - displayName: User's display name
 * - userId: User's ID
 */

import { DailyCompanionDashboard } from "@/components/daily-companion/DailyCompanionDashboard";

interface DashboardTodaySectionProps {
  displayName: string;
  userId: string;
}

export function DashboardTodaySection({
  displayName,
  userId,
}: DashboardTodaySectionProps) {
  return (
    <div className="space-y-8">
      {/* Daily Companion - Primary Experience */}
      <div>
        <DailyCompanionDashboard
          displayName={displayName}
          userId={userId}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-[#e8ddd2]" />
    </div>
  );
}
