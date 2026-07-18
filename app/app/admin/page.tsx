"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAllBadges } from "@/lib/data/badges";
import { getUpcomingEvents } from "@/lib/data/events";
import { getAllOffers } from "@/lib/data/offers";
import { getSession } from "@/lib/session";
import { getMemberStats, getActivityStats, getSpaceStats, getMemberTypeBreakdown, type MemberStats, type ActivityStats, type SpaceStats, type MemberTypeBreakdown } from "@/lib/admin/analytics";
import { supabase } from "@/lib/supabase/client";
import { getAllProfilesLite } from "@/lib/data/profiles";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { IconConnection, IconDemo, IconSpaces, IconBadges, IconProgress, IconUpcoming, IconAlert, IconForYou, IconChat, IconProfileNav } from "@/components/Icons";
import { getBadgeImage } from "@/lib/badge-icons";
import { getOfferIcon } from "@/lib/offer-icons";
import { RhythmContentAlert } from "@/components/admin/RhythmContentAlert";
import { RhythmContentEditor } from "@/components/admin/RhythmContentEditor";
import { DailyCompanionEditor } from "@/components/admin/DailyCompanionEditor";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function AdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [concerns, setConcerns] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [spaceStats, setSpaceStats] = useState<SpaceStats[]>([]);
  const [memberTypes, setMemberTypes] = useState<MemberTypeBreakdown | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // Check if user is admin
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }
      setIsAdmin(true);

      setBadges(getAllBadges());
      setOffers(getAllOffers());

      // Everything below is independent -- fetch it all in parallel rather
      // than one await after another. This alone doesn't change how long
      // the slowest individual query takes (see getSpaceStats' own
      // bulk-query fix for that), but it stops every fetch from queueing
      // behind the others, so total load time is close to the slowest
      // single fetch instead of the sum of all of them.
      const emailsPromise = (async () => {
        if (!supabase) return {} as Record<string, string | undefined>;
        try {
          const {
            data: { session: authSession },
          } = await supabase.auth.getSession();
          const token = authSession?.access_token;
          if (!token) return {};
          const response = await fetch("/api/admin/members/emails", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) return {};
          const { emails } = await response.json();
          return emails as Record<string, string | undefined>;
        } catch (err) {
          console.error("Error loading member emails:", err);
          return {};
        }
      })();

      const [
        realProfilesResult,
        upcomingEventsResult,
        analyticsResult,
        reportsResult,
        emails,
      ] = await Promise.allSettled([
        getAllProfilesLite(),
        getUpcomingEvents(),
        Promise.all([getMemberStats(), getActivityStats(), getSpaceStats(), getMemberTypeBreakdown()]),
        supabase
          ? supabase.from("reports").select("id, reason, status, created_at").order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        emailsPromise,
      ]);

      const emailByProfileId = emails.status === "fulfilled" ? emails.value : {};

      if (realProfilesResult.status === "fulfilled") {
        // getAllProfiles() was never called here before -- this table was
        // showing hardcoded seed data (lib/seed/demo-members) instead of
        // real members, so real signups never appeared regardless of how
        // many people actually joined.
        setAllMembers(
          realProfilesResult.value
            .filter((p) => !p.is_demo_profile)
            .map((p) => ({ ...p, email: emailByProfileId[p.id] }))
        );
      } else {
        console.error("Error loading members:", realProfilesResult.reason);
      }

      if (upcomingEventsResult.status === "fulfilled") {
        setEvents(upcomingEventsResult.value);
      }

      if (analyticsResult.status === "fulfilled") {
        const [members, activity, spaces, types] = analyticsResult.value;
        setMemberStats(members);
        setActivityStats(activity);
        setSpaceStats(spaces);
        setMemberTypes(types);
      } else {
        console.error("Error loading analytics:", analyticsResult.reason);
      }

      // Reported concerns, from the real reports table -- this previously
      // read localStorage, which only ever reflected reports filed from
      // the admin's own browser, never real member submissions.
      if (reportsResult.status === "fulfilled" && !("error" in reportsResult.value && reportsResult.value.error)) {
        const reportsData = (reportsResult.value as any).data;
        setConcerns((reportsData || []).map((r: any) => ({ id: r.id, concern: r.reason, status: r.status })));
      } else {
        console.error("Error loading reports:", reportsResult.status === "fulfilled" ? (reportsResult.value as any).error : reportsResult.reason);
      }

      setMounted(true);
    };

    loadData();
  }, [router]);

  // Real signups, derived from allMembers -- previously sourced from a
  // localStorage key (trackSignup() in lib/session.ts) written only in
  // whatever browser a member happened to sign up in, so an admin visiting
  // from a different device or after clearing storage never saw any real
  // signups here, regardless of how many people had actually joined.
  const recentSignups = useMemo(() => {
    return [...allMembers]
      .filter((m) => m.joinedAt)
      .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
  }, [allMembers]);

  const newSignupsToday = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return recentSignups.filter((m) => new Date(m.joinedAt).getTime() > oneDayAgo);
  }, [recentSignups]);

  if (!mounted) {
    return <LoadingScreen message="Loading admin dashboard" subtitle="We're gathering the data. Just a moment..." />;
  }

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/app" },
          { label: "Admin Dashboard", isActive: true },
        ]}
      />
      <div>
        <h1 className="text-4xl text-[#1a0f0a]">Admin Dashboard</h1>
        <p className="text-lg text-[#1a0f0a] mt-2">
          Community overview and management
        </p>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3">
        <Link href="/app/admin/overview">
          <Button variant="outline" size="sm">
            📈 Analytics
          </Button>
        </Link>
        <Link href="/app/admin/members">
          <Button variant="outline" size="sm">
            👥 Manage Members
          </Button>
        </Link>
        <Link href="/app/admin/events">
          <Button variant="outline" size="sm">
            📅 Manage Events
          </Button>
        </Link>
        <Link href="/app/admin/moderation">
          <Button variant="outline" size="sm">
            🛡️ Moderate Posts & Comments
          </Button>
        </Link>
        <Link href="/app/admin/activity">
          <Button variant="outline" size="sm">
            📢 Activity Feed
          </Button>
        </Link>
        <Link href="/app/admin/invites">
          <Button variant="outline" size="sm">
            📊 Invite Relationships
          </Button>
        </Link>
        <Link href="/app/admin/concerns">
          <Button variant="outline" size="sm">
            ⚠️ Reported Concerns
          </Button>
        </Link>
        <Link href="/app/admin/daily-companion">
          <Button variant="outline" size="sm">
            ✨ Daily Content
          </Button>
        </Link>
        <Link href="/app/admin/emails">
          <Button variant="outline" size="sm">
            ✉️ Automated Emails
          </Button>
        </Link>
        <Link href="/app/admin/broadcast">
          <Button variant="outline" size="sm">
            📣 Broadcast Email
          </Button>
        </Link>
        <Link href="/app/admin/sync-articles">
          <Button variant="outline" size="sm">
            🔄 Sync Substack Articles
          </Button>
        </Link>
      </div>

      {/* Content Alerts */}
      <RhythmContentAlert />

      {/* New Signup Notification -- real signups in the last 24 hours */}
      {newSignupsToday.length > 0 && (
        <div className="p-4 bg-[#c97a2a] rounded-lg border-2 border-[#a84a2a]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-semibold text-white text-lg">🎉 New Signup!</p>
              <p className="text-white text-sm mt-1">
                {newSignupsToday[0].firstName} {newSignupsToday[0].lastName} just joined the community
              </p>
              {newSignupsToday.length > 1 && (
                <p className="text-white/90 text-xs mt-2">
                  +{newSignupsToday.length - 1} more signup{newSignupsToday.length > 2 ? 's' : ''} today
                </p>
              )}
            </div>
            <div className="flex-shrink-0 text-white text-2xl font-bold bg-[#a84a2a] w-12 h-12 rounded-full flex items-center justify-center">
              {newSignupsToday.length}
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader title="Total Members" icon={<IconProfileNav size={20} />} />
          <p className="text-3xl font-bold text-[#d4a348]">{memberStats?.totalMembers || 0}</p>
          <p className="text-sm text-[#a0704a] mt-2">+{memberStats?.newThisWeek || 0} this week</p>
        </Card>

        <Card>
          <CardHeader title="Active This Week" icon={<IconAlert size={20} />} />
          <p className="text-3xl font-bold text-[#d4a348]">{memberStats?.activeThisWeek || 0}</p>
          <p className="text-sm text-[#a0704a] mt-2">
            {memberStats?.totalMembers
              ? Math.round((memberStats.activeThisWeek / memberStats.totalMembers) * 100)
              : 0}% engagement
          </p>
        </Card>

        <Card>
          <CardHeader title="Posts & Responses" icon={<IconChat size={20} />} />
          <p className="text-3xl font-bold text-[#d4a348]">
            {(activityStats?.postsThisWeek || 0) + (activityStats?.commentsThisWeek || 0)}
          </p>
          <p className="text-sm text-[#a0704a] mt-2">
            {activityStats?.postsThisWeek || 0} posts, {activityStats?.commentsThisWeek || 0} comments
          </p>
        </Card>

        <Card>
          <CardHeader title="Community Activity" icon={<IconConnection size={20} />} />
          <p className="text-3xl font-bold text-[#d4a348]">{activityStats?.reactionsThisWeek || 0}</p>
          <p className="text-sm text-[#a0704a] mt-2">Reactions this week</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent Signups" icon={<IconProfileNav size={20} />} />
        <div className="space-y-3">
          {recentSignups.length > 0 ? (
            recentSignups
              .slice(0, 10)
              .map((signup: any) => (
                <div key={signup.id} className="flex justify-between items-start p-3 bg-[#f3ede5] rounded text-sm">
                  <div className="flex-1">
                    <p className="font-medium text-[#1a0f0a]">{signup.firstName} {signup.lastName}</p>
                    <p className="text-xs text-[#a0704a]">{signup.email || "—"}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-[#1a0f0a]">{new Date(signup.joinedAt).toLocaleDateString()}</p>
                    <p className="text-[#d4a348] font-medium capitalize">{signup.memberType}</p>
                  </div>
                </div>
              ))
          ) : (
            <p className="text-[#a0704a] text-sm">No real signups yet</p>
          )}
        </div>
      </Card>

      {/* All Members List */}
      <Card>
        <CardHeader title="All Members" icon={<IconProfileNav size={20} />} />
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search members by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a0f0a] placeholder-[#a0704a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e8e3db]">
                  <th className="text-left py-2 px-2 text-[#a0704a] font-medium">Name</th>
                  <th className="text-left py-2 px-2 text-[#a0704a] font-medium">Email</th>
                  <th className="text-left py-2 px-2 text-[#a0704a] font-medium">Type</th>
                  <th className="text-left py-2 px-2 text-[#a0704a] font-medium">Joined</th>
                  <th className="text-left py-2 px-2 text-[#a0704a] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allMembers
                  .filter((member) =>
                    searchTerm === "" ||
                    member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    member.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((member, idx) => (
                    <tr key={idx} className="border-b border-[#f3ede5] hover:bg-[#f8f6f2] transition-colors">
                      <td className="py-3 px-2 text-[#1a0f0a] font-medium">
                        {member.firstName} {member.lastName}
                      </td>
                      <td className="py-3 px-2 text-[#1a0f0a]">{member.email || "—"}</td>
                      <td className="py-3 px-2 text-[#1a0f0a] capitalize">{member.memberType || "member"}</td>
                      <td className="py-3 px-2 text-[#a0704a] text-xs">
                        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-2">
                        {member.id && (
                          <Link href={`/app/admin/members/${member.id}`}>
                            <button className="text-xs px-2 py-1 text-[#d4a348] hover:bg-[#fef8e8] rounded transition-colors">
                              View
                            </button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[#a0704a] mt-2">
            Showing {allMembers.filter((m) =>
              searchTerm === "" ||
              m.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              m.email?.toLowerCase().includes(searchTerm.toLowerCase())
            ).length} of {allMembers.length} members
          </p>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Most Active Spaces" icon={<IconSpaces size={20} />} />
          <div className="space-y-3">
            {spaceStats.length === 0 ? (
              <p className="text-[#a0704a] text-sm">No space activity yet</p>
            ) : (
              spaceStats.slice(0, 3).map((space) => (
                <div key={space.spaceId} className="flex justify-between">
                  <span className="text-[#1a0f0a]">{space.spaceName}</span>
                  <span className="font-medium text-[#1a0f0a]">{space.memberCount} members</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Member Types" icon={<IconProgress size={20} />} />
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[#1a0f0a]">Individual</span>
              <span className="font-medium text-[#1a0f0a]">{memberTypes?.individual ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#1a0f0a]">Partnered Individual</span>
              <span className="font-medium text-[#1a0f0a]">{memberTypes?.partneredIndividual ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#1a0f0a]">Couples</span>
              <span className="font-medium text-[#1a0f0a]">{memberTypes?.couple ?? 0}</span>
            </div>
            {(memberTypes?.other ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-[#1a0f0a]">Other</span>
                <span className="font-medium text-[#1a0f0a]">{memberTypes?.other}</span>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Reported Concerns" icon={<IconAlert size={20} />} />
          <div className="space-y-3">
            {concerns.length > 0 ? (
              <>
                <p className="text-[#1a0f0a] text-sm font-medium">{concerns.length} pending review</p>
                {concerns.slice(0, 2).map((concern: any) => (
                  <div key={concern.id} className="text-xs p-2 bg-[#f3ede5] rounded">
                    <p className="text-[#1a0f0a]">{concern.concern.substring(0, 50)}...</p>
                    <p className="text-[#a0704a]">Status: {concern.status}</p>
                  </div>
                ))}
              </>
            ) : (
              <>
                <p className="text-[#1a0f0a] text-sm">No active concerns</p>
                <div className="text-[#c97a2a] text-sm font-medium">✓ Community in good standing</div>
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Quick Stats" icon={<IconProgress size={20} />} />
          <div className="space-y-2 text-sm">
            <p className="text-[#1a0f0a]">
              Avg comments per post (this week):{" "}
              {activityStats && activityStats.postsThisWeek > 0
                ? (activityStats.commentsThisWeek / activityStats.postsThisWeek).toFixed(1)
                : "—"}
            </p>
            <p className="text-[#1a0f0a]">
              Onboarding completion:{" "}
              {memberStats && memberStats.totalMembers > 0
                ? `${Math.round((memberStats.completedOnboarding / memberStats.totalMembers) * 100)}%`
                : "—"}
            </p>
            <p className="text-[#1a0f0a]">
              Active this week:{" "}
              {memberStats && memberStats.totalMembers > 0
                ? `${Math.round((memberStats.activeThisWeek / memberStats.totalMembers) * 100)}%`
                : "—"}
            </p>
          </div>
        </Card>
      </div>

      {/* Badges */}
      <Card>
        <CardHeader title="Available Badges" icon={<IconBadges size={20} />} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <div key={badge.id} className="text-center p-3 bg-[#f3ede5] rounded">
              <img
                src={getBadgeImage(badge.id)}
                alt={badge.name}
                className="mx-auto mb-2 w-10 h-10 object-contain"
              />
              <p className="font-medium text-[#1a0f0a] text-sm">{badge.name}</p>
              <p className="text-xs text-[#a0704a] mt-1">{badge.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader title="Upcoming Events" icon={<IconUpcoming size={20} />} />
        <div className="space-y-3">
          {events.length > 0 ? (
            events.slice(0, 3).map((event) => (
              <div key={event.id} className="border-l-4 border-[#d4a348] pl-3">
                <p className="font-medium text-[#1a0f0a]">{event.title}</p>
                <p className="text-sm text-[#1a0f0a]">
                  {event.date.toLocaleDateString()} at {event.time}
                </p>
                <p className="text-xs text-[#a0704a]">
                  {event.attendeeCount} interested • {event.format}
                </p>
              </div>
            ))
          ) : (
            <p className="text-[#a0704a] text-sm">No upcoming events</p>
          )}
        </div>
      </Card>

      {/* Offers */}
      <Card>
        <CardHeader title="Active Offers" icon={<IconForYou size={20} />} />
        <div className="grid md:grid-cols-2 gap-4">
          {offers.map((offer) => {
            const OfferIcon = getOfferIcon(offer.id);
            return (
              <div key={offer.id} className="p-3 bg-[#f3ede5] rounded">
                <OfferIcon size={24} className="mb-1 text-[#d4a348]" />
                <p className="font-medium text-[#1a0f0a] text-sm">{offer.title}</p>
                <p className="text-xs text-[#1a0f0a] mt-1">{offer.description}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Content Editors */}
      <div className="border-t border-[#e8ddd2] pt-8 space-y-8">
        {/* Daily Companion Editor */}
        <div>
          <DailyCompanionEditor />
        </div>

        {/* Guided Rhythm Editor */}
        <div className="border-t border-[#e8ddd2] pt-8">
          <RhythmContentEditor />
        </div>
      </div>

      <Card className="bg-[#f3ede5]">
        <CardHeader title="Demo Mode Features" icon={<IconDemo size={20} />} />
        <p className="text-[#1a0f0a] mb-4">
          This admin dashboard shows demo data. In Phase 2, you&apos;ll be able to:
        </p>
        <ul className="space-y-2 text-[#1a0f0a] text-sm">
          <li>✓ View real-time member activity</li>
          <li>✓ Manage reported concerns and moderation</li>
          <li>✓ View detailed member profiles (with privacy controls)</li>
          <li>✓ Edit prompts, badges, events, and community settings</li>
          <li>✓ Export data and analytics reports</li>
          <li>✓ Manage offers and service integrations</li>
        </ul>
      </Card>
    </div>
  );
}
