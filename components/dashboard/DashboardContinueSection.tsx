/**
 * DashboardContinueSection
 *
 * The secondary dashboard section.
 * Shows where the user left off and recent activity.
 *
 * Includes:
 * - Continue where you left off
 * - Recent reflections
 * - Upcoming events
 *
 * Props:
 * - profile: User profile data
 * - recentReflections: Recent reflection responses
 * - upcomingEvents: Upcoming events (limited to 2)
 * - loading: Whether data is still loading
 */

import type { Profile } from "@/lib/data/profiles";
import type { RecentReflection } from "@/lib/data/reflections";
import { ContinueWhereYouLeftOff } from "@/components/daily-companion/ContinueWhereYouLeftOff";

interface DashboardContinueSectionProps {
  profile: Profile;
  recentReflections: RecentReflection[];
  upcomingEvents: any[];
  loading?: boolean;
}

export function DashboardContinueSection({
  profile,
  recentReflections,
  upcomingEvents,
  loading = false,
}: DashboardContinueSectionProps) {
  return (
    <div className="space-y-8">
      {/* Continue Where You Left Off */}
      <ContinueWhereYouLeftOff
        profile={profile}
        recentReflections={recentReflections}
        upcomingEvents={upcomingEvents}
      />

      {/* Divider */}
      <div className="border-t border-[#e8ddd2]" />
    </div>
  );
}
