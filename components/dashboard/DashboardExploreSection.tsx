/**
 * DashboardExploreSection
 *
 * The tertiary, exploratory dashboard section (below the fold).
 * Shows community discovery, journey progress, and achievements.
 *
 * Includes:
 * - Journey progress (Seven Doors + Guided Rhythm)
 * - Articles/writing
 * - Your spaces
 * - Community members + invite
 * - Ways to connect
 * - Reflections from room
 * - Upcoming events
 * - Badges/achievements
 *
 * Can be collapsible/expandable for mobile to reduce cognitive load.
 */

import Link from "next/link";
import type { Profile } from "@/lib/data/profiles";
import type { Article } from "@/lib/data/articles";
import type { RecentReflection } from "@/lib/data/reflections";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { FirstWeekDashboardCard } from "@/components/journey/FirstWeekDashboardCard";
import { MonthlyDashboardCard } from "@/components/guided-rhythm/MonthlyDashboardCard";
import { CommunityMembersGrid } from "@/components/community/CommunityMembersGrid";
import { WaysToConnectCard } from "@/components/connection/WaysToConnectCard";
import { ReflectionsFromRoomCard } from "@/components/connection/ReflectionsFromRoomCard";
import { ThemeRelatedContent } from "@/components/dashboard/ThemeRelatedContent";
import { InvitePanel } from "@/components/invites/InvitePanel";
import { SpaceIconSVG } from "@/components/SpaceIconSVG";
import { getBadgeImage } from "@/lib/badge-icons";
import { getTodaysDailyContent } from "@/lib/data/daily-companion";
import { useState, useEffect } from "react";

interface DashboardExploreSectionProps {
  profile: Profile;
  spaces: any[];
  badges: any[];
  newestArticle: Article | null;
  recentReflections: RecentReflection[];
  upcomingEvents: any[];
  loading?: boolean;
}

export function DashboardExploreSection({
  profile,
  spaces,
  badges,
  newestArticle,
  recentReflections,
  upcomingEvents,
  loading = false,
}: DashboardExploreSectionProps) {
  const [invitePanelOpen, setInvitePanelOpen] = useState(false);
  const [todaysTheme, setTodaysTheme] = useState<{ title: string; theme: string } | null>(null);

  const joinedSpacesCount = profile.spacesJoined?.length ?? 0;

  // Load today's theme for theme-related content discovery
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const dailyContent = await getTodaysDailyContent();
        if (dailyContent?.theme) {
          setTodaysTheme({
            title: dailyContent.theme.title,
            theme: dailyContent.theme.title.toLowerCase().replace(/\s+/g, "_"),
          });
        }
      } catch (err) {
        console.warn("Error loading today's theme:", err);
      }
    };
    loadTheme();
  }, []);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-[#1a0f0a]">Explore</h2>

      {/* Journey Progress Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#1a0f0a]">Your Journey</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">
              Seven Doors Journey
            </h4>
            <FirstWeekDashboardCard />
          </div>
          <div>
            <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">
              Guided Rhythm
            </h4>
            <MonthlyDashboardCard />
          </div>
        </div>
      </div>

      {/* Articles */}
      {newestArticle && (
        <div>
          <h3 className="text-lg font-semibold text-[#1a0f0a] mb-4">From My Writing</h3>
          <Card className="overflow-hidden">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#c97a2a] mb-2">
                  {new Date(newestArticle.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <h4 className="text-xl font-bold text-[#1a0f0a] mb-3">
                  {newestArticle.title}
                </h4>
                <p className="text-[#1a0f0a] text-sm leading-relaxed">
                  {newestArticle.excerpt}
                </p>
              </div>
              <div className="flex gap-3">
                <a href={newestArticle.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="primary" size="sm">
                    Read Full Article →
                  </Button>
                </a>
                <Link href="/app/articles">
                  <Button variant="outline" size="sm">
                    See All Articles
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Today's Theme - Related Content Discovery */}
      {todaysTheme && (
        <ThemeRelatedContent
          themeName={todaysTheme.theme}
          themeTitle={todaysTheme.title}
          loading={loading}
        />
      )}

      {/* Spaces */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#1a0f0a]">Your Community</h3>

        {/* Community Members Grid + Invite */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <CommunityMembersGrid />
          </div>
          <Card className="flex flex-col justify-center">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-[#1a0f0a]">
                Know someone who belongs here?
              </h4>
              <p className="text-sm text-[#4A3E33]">
                Invite a friend who is looking for more honest connection, community, and real conversation.
              </p>
              <Button
                onClick={() => setInvitePanelOpen(true)}
                style={{
                  background: "linear-gradient(135deg, #D4A040 0%, #A67C2A 100%)",
                  color: "#FFFDF8",
                }}
              >
                Invite a Friend
              </Button>
            </div>
          </Card>
        </div>

        {/* Your Spaces */}
        {joinedSpacesCount > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">
              All Your Spaces
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {spaces
                .filter((s) => profile?.spacesJoined?.includes(s.id) && !s.hidden)
                .map((space) => (
                  <Link key={space.id} href={`/app/spaces/${space.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-auto flex flex-col items-center gap-1 py-2 hover:bg-[#f3ede5] hover:border-[#c99563] transition-all"
                    >
                      <SpaceIconSVG spaceId={space.id} size={18} />
                      <span className="text-center text-xs font-medium line-clamp-2">
                        {space.name}
                      </span>
                    </Button>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* Explore All Spaces */}
        <Link href="/app/spaces">
          <Button>Explore All Spaces</Button>
        </Link>

        {/* Connection & Reflection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
          <div>
            <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">
              Ways to Connect
            </h4>
            <WaysToConnectCard />
          </div>
          <div>
            <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">
              From the Room
            </h4>
            <ReflectionsFromRoomCard recentReflections={recentReflections} />
          </div>
        </div>

        {/* Events */}
        {upcomingEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">
              Upcoming Events
            </h4>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="bg-white">
                  <div className="space-y-2">
                    <p className="font-medium text-[#1a0f0a]">{event.title}</p>
                    <p className="text-sm text-[#1a0f0a]">
                      {event.date
                        ? new Date(event.date).toLocaleDateString()
                        : "TBA"}
                      {event.time && ` at ${event.time}`}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="hidden md:block">
            <h3 className="text-lg font-bold text-[#d4a348] mb-3">🏆 Your Achievements</h3>
            <div className="grid grid-cols-4 lg:grid-cols-5 gap-0">
              {badges.map((badge) => (
                <img
                  key={badge.id}
                  src={getBadgeImage(badge.id)}
                  alt={badge.name}
                  title={`${badge.name}: ${badge.description}`}
                  className="w-48 h-48 object-contain cursor-pointer hover:scale-110 transition-transform drop-shadow -m-2"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite Panel Modal */}
      <InvitePanel
        isOpen={invitePanelOpen}
        onClose={() => setInvitePanelOpen(false)}
      />
    </div>
  );
}
