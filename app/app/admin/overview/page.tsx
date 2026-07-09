"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getMemberStats, getActivityStats, getEventStats, getOfferStats, getSeededContentStats, type MemberStats, type ActivityStats, type EventStats, type OfferStats, type SeededContentStats } from "@/lib/admin/analytics";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function AdminOverviewPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [offerStats, setOfferStats] = useState<OfferStats | null>(null);
  const [seededStats, setSeededStats] = useState<SeededContentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }

      try {
        const [members, activity, events, offers, seeded] = await Promise.all([
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
        ]);

        setMemberStats(members);
        setActivityStats(activity);
        setEventStats(events);
        setOfferStats(offers);
        setSeededStats(seeded);
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
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-[#1a0f0a]">Admin Dashboard</h1>
        <p className="text-lg text-[#a0704a] mt-2">Launch readiness overview</p>
      </div>

      {/* Migration Status Info */}
      {!memberStats || memberStats.totalMembers === 0 ? (
        <Card className="bg-blue-50 border-2 border-blue-300">
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-900">
              ℹ️ Supabase Migrations Pending
            </p>
            <p className="text-sm text-blue-800">
              To activate the admin dashboard fully, apply the migrations to your Supabase database:
            </p>
            <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
              <li>Run migrations 012 and 013 from <code className="bg-blue-100 px-1 rounded">supabase/migrations/</code></li>
              <li>These add admin role, event/offer management, and seeded content tracking</li>
              <li>After applying, refresh this page to see real data</li>
            </ol>
            <p className="text-xs text-blue-700 italic mt-3">
              The overview will show demo/zero data until migrations are applied.
            </p>
          </div>
        </Card>
      ) : null}

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
