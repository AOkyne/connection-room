"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getMemberStats, getActivityStats, getEventStats, getOfferStats, getSeededContentStats, getSpaceStats, type MemberStats, type ActivityStats, type EventStats, type OfferStats, type SeededContentStats, type SpaceStats } from "@/lib/admin/analytics";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function AdminOverviewPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [offerStats, setOfferStats] = useState<OfferStats | null>(null);
  const [seededStats, setSeededStats] = useState<SeededContentStats | null>(null);
  const [spaceStats, setSpaceStats] = useState<SpaceStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }

      try {
        const [members, activity, events, offers, seeded, spaces] = await Promise.all([
          getMemberStats().catch(() => ({
            totalMembers: 0,
            newThisWeek: 0,
            newThisMonth: 0,
            completedOnboarding: 0,
            withProfilePhoto: 0,
            activeThisWeek: 0,
            activeThisMonth: 0,
          })),
          getActivityStats().catch(() => ({
            postsThisWeek: 0,
            commentsThisWeek: 0,
            reactionsThisWeek: 0,
            activeMembers: [],
          })),
          getEventStats().catch(() => ({
            totalPublished: 0,
            totalDraft: 0,
            upcomingCount: 0,
            totalRegistrations: 0,
            registrationsByEvent: [],
          })),
          getOfferStats().catch(() => ({
            totalActive: 0,
            totalDraft: 0,
            featuredCount: 0,
            totalOffers: 0,
          })),
          getSeededContentStats().catch(() => ({
            seededProfiles: 0,
            seededPosts: 0,
            seededComments: 0,
            seededEvents: 0,
            seededOffers: 0,
            realProfiles: 0,
            realPosts: 0,
            realComments: 0,
            realEvents: 0,
            realOffers: 0,
          })),
          getSpaceStats().catch(() => []),
        ]);

        setMemberStats(members);
        setActivityStats(activity);
        setEventStats(events);
        setOfferStats(offers);
        setSeededStats(seeded);
        setSpaceStats(spaces);
      } catch (error) {
        console.error("Error loading admin data:", error);
      }

      setMounted(true);
      setLoading(false);
    };

    loadData();
  }, [router]);

  if (!mounted || loading) {
    return (
      <LoadingScreen
        message="Loading admin overview"
        subtitle="Gathering community metrics..."
      />
    );
  }

  return (
    <div className="space-y-8 max-w-7xl">
      <Breadcrumb
        items={[
          { label: "Admin", href: "/app/admin" },
          { label: "Analytics", isActive: true },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#1a0f0a]">Analytics</h1>
          <p className="text-lg text-[#a0704a] mt-2">Community metrics and performance</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-[#d4a348] hover:text-[#c9956d] transition-colors text-sm whitespace-nowrap"
          aria-label="Go back"
        >
          ← Back
        </button>
      </div>

      {/* Setup Status Info */}
      <Card className="bg-blue-50 border-2 border-blue-300">
        <div className="space-y-2">
          <p className="text-sm font-medium text-blue-900">
            ℹ️ Admin Dashboard Setup
          </p>
          <p className="text-sm text-blue-800">
            The launch readiness overview is available. Some analytics features may require additional configuration:
          </p>
          <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
            <li>Migrations 012 and 013 have been applied</li>
            <li>Event/offer management tables are ready</li>
            <li>Seeded content tracking is enabled</li>
            <li>Some analytics may show zero due to RLS policies</li>
          </ul>
        </div>
      </Card>

      {/* Launch Snapshot - Key Metrics */}
      <div>
        <h2 className="text-2xl font-bold text-[#1a0f0a] mb-4">Launch Snapshot</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Members */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-900">Total Members</p>
              <p className="text-4xl font-bold text-blue-900">
                {memberStats?.totalMembers || 0}
              </p>
              <p className="text-xs text-blue-800">
                {memberStats?.newThisWeek || 0} new this week
              </p>
            </div>
          </Card>

          {/* Active This Week */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-900">Active This Week</p>
              <p className="text-4xl font-bold text-green-900">
                {memberStats?.activeThisWeek || 0}
              </p>
              <p className="text-xs text-green-800">
                {Math.round(
                  ((memberStats?.activeThisWeek || 0) /
                    (memberStats?.totalMembers || 1)) *
                    100
                )}
                % engagement
              </p>
            </div>
          </Card>

          {/* Onboarding Completion */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
            <div className="space-y-2">
              <p className="text-sm font-medium text-purple-900">Onboarding</p>
              <p className="text-4xl font-bold text-purple-900">
                {memberStats?.completedOnboarding || 0}
              </p>
              <p className="text-xs text-purple-800">
                {Math.round(
                  ((memberStats?.completedOnboarding || 0) /
                    (memberStats?.totalMembers || 1)) *
                    100
                )}
                % completed
              </p>
            </div>
          </Card>

          {/* Posts & Comments */}
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
            <div className="space-y-2">
              <p className="text-sm font-medium text-orange-900">Posts This Week</p>
              <p className="text-4xl font-bold text-orange-900">
                {activityStats?.postsThisWeek || 0}
              </p>
              <p className="text-xs text-orange-800">
                {activityStats?.commentsThisWeek || 0} comments
              </p>
            </div>
          </Card>

          {/* Events */}
          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200">
            <div className="space-y-2">
              <p className="text-sm font-medium text-pink-900">Events</p>
              <p className="text-4xl font-bold text-pink-900">
                {eventStats?.upcomingCount || 0}
              </p>
              <p className="text-xs text-pink-800">
                {eventStats?.totalRegistrations || 0} registrations
              </p>
            </div>
          </Card>

          {/* Offers */}
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-900">Active Offers</p>
              <p className="text-4xl font-bold text-amber-900">
                {offerStats?.totalActive || 0}
              </p>
              <p className="text-xs text-amber-800">
                {offerStats?.featuredCount || 0} featured
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Seeded Content Status (Beta Indicator) */}
      <Card className="bg-amber-50 border-2 border-amber-300">
        <CardHeader title="🌱 Community Bootstrap Status" />
        <div className="space-y-4">
          <p className="text-sm text-[#1a0f0a]">
            This is beta. Seeded content keeps the room warm during ramp-up. After launch, you can clean up seeded data when community reaches critical mass.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-amber-200">
            <div>
              <p className="text-xs text-amber-900 font-medium">Seeded Members</p>
              <p className="text-xl font-bold text-amber-900">
                {seededStats?.seededProfiles || 0}
              </p>
              <p className="text-xs text-amber-800">
                {seededStats?.realProfiles || 0} real
              </p>
            </div>
            <div>
              <p className="text-xs text-amber-900 font-medium">Seeded Posts</p>
              <p className="text-xl font-bold text-amber-900">
                {seededStats?.seededPosts || 0}
              </p>
              <p className="text-xs text-amber-800">
                {seededStats?.realPosts || 0} real
              </p>
            </div>
            <div>
              <p className="text-xs text-amber-900 font-medium">Seeded Comments</p>
              <p className="text-xl font-bold text-amber-900">
                {seededStats?.seededComments || 0}
              </p>
              <p className="text-xs text-amber-800">
                {seededStats?.realComments || 0} real
              </p>
            </div>
            <div>
              <p className="text-xs text-amber-900 font-medium">Seeded Events</p>
              <p className="text-xl font-bold text-amber-900">
                {seededStats?.seededEvents || 0}
              </p>
              <p className="text-xs text-amber-800">
                {seededStats?.realEvents || 0} real
              </p>
            </div>
            <div>
              <p className="text-xs text-amber-900 font-medium">Seeded Offers</p>
              <p className="text-xl font-bold text-amber-900">
                {seededStats?.seededOffers || 0}
              </p>
              <p className="text-xs text-amber-800">
                {seededStats?.realOffers || 0} real
              </p>
            </div>
          </div>

          <p className="text-xs text-amber-900 italic pt-2">
            ⚠️ Seeded content deletion will be available after launch
          </p>
        </div>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-[#1a0f0a] mb-4">Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/app/admin/events">
            <Button variant="primary" size="md" className="w-full">
              📅 Events
            </Button>
          </Link>
          <Link href="/app/admin/offers">
            <Button variant="primary" size="md" className="w-full">
              🎁 Offers
            </Button>
          </Link>
          <Link href="/app/admin/analytics">
            <Button variant="secondary" size="md" className="w-full">
              📊 Analytics
            </Button>
          </Link>
          <Link href="/app/admin/members">
            <Button variant="secondary" size="md" className="w-full">
              👥 Members
            </Button>
          </Link>
        </div>
      </div>

      {/* Space Analytics */}
      {spaceStats && spaceStats.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-[#1a0f0a] mb-4">Space Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {spaceStats.map((space) => (
              <Card key={space.spaceId} className="border-l-4 border-[#d4a348]">
                <div className="space-y-2">
                  <h3 className="font-semibold text-[#1a0f0a]">{space.spaceName}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[#a0704a]">Members</p>
                      <p className="text-lg font-bold text-[#1a0f0a]">{space.memberCount}</p>
                    </div>
                    <div>
                      <p className="text-[#a0704a]">Posts</p>
                      <p className="text-lg font-bold text-[#1a0f0a]">{space.postCount}</p>
                    </div>
                    <div>
                      <p className="text-[#a0704a]">Comments</p>
                      <p className="text-lg font-bold text-[#1a0f0a]">{space.commentCount}</p>
                    </div>
                    <div>
                      <p className="text-[#a0704a]">Active This Week</p>
                      <p className="text-lg font-bold text-[#1a0f0a]">{space.activeThisWeek}</p>
                    </div>
                  </div>
                  {space.lastActivity && (
                    <p className="text-xs text-[#a0704a]">
                      Last activity: {new Date(space.lastActivity).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Profile Photo Status */}
      <Card>
        <CardHeader title="Member Profile Completeness" />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#1a0f0a]">Profile photos uploaded</p>
            <p className="text-lg font-bold text-[#1a0f0a]">
              {memberStats?.withProfilePhoto || 0}/{memberStats?.totalMembers || 0}
            </p>
          </div>
          <div className="w-full bg-[#e8ddd2] rounded-full h-2">
            <div
              className="bg-[#d4a348] h-2 rounded-full"
              style={{
                width: `${
                  Math.round(
                    ((memberStats?.withProfilePhoto || 0) /
                      (memberStats?.totalMembers || 1)) *
                      100
                  )
                }%`,
              }}
            />
          </div>
          <p className="text-xs text-[#a0704a]">
            {Math.round(
              ((memberStats?.withProfilePhoto || 0) /
                (memberStats?.totalMembers || 1)) *
                100
            )}
            % complete
          </p>
        </div>
      </Card>
    </div>
  );
}
