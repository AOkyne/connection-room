"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAllBadges } from "@/lib/data/badges";
import { getUpcomingEvents } from "@/lib/data/events";
import { getAllOffers } from "@/lib/data/offers";
import { getRecentSignups, getSession } from "@/lib/session";
import { demoMembers } from "@/lib/seed/demo-members";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { IconConnection, IconDemo, IconSpaces, IconBadges, IconProgress, IconUpcoming, IconAlert, IconForYou, IconChat, IconProfileNav } from "@/components/Icons";
import { getBadgeImage } from "@/lib/badge-icons";
import { getOfferIcon } from "@/lib/offer-icons";
import { RhythmContentAlert } from "@/components/admin/RhythmContentAlert";
import { RhythmContentEditor } from "@/components/admin/RhythmContentEditor";
import { DailyCompanionEditor } from "@/components/admin/DailyCompanionEditor";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function AdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [concerns, setConcerns] = useState<any[]>([]);
  const [recentSignups, setRecentSignups] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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
      setEvents(getUpcomingEvents());
      setOffers(getAllOffers());
      setRecentSignups(getRecentSignups());
      setAllMembers(demoMembers);

      // Load reported concerns from localStorage
      if (typeof window !== "undefined") {
        const storedConcerns = localStorage.getItem("connection-room:connection-reports");
        if (storedConcerns) {
          setConcerns(JSON.parse(storedConcerns));
        }
      }

      setMounted(true);
    };

    loadData();
  }, [router]);

  if (!mounted) {
    return <LoadingScreen message="Loading admin dashboard" subtitle="We're gathering the data. Just a moment..." />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl text-[#1a0f0a]">Admin Dashboard</h1>
        <p className="text-lg text-[#1a0f0a] mt-2">
          Community overview and management
        </p>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3">
        <Link href="/app/admin/invites">
          <Button variant="outline" size="sm">
            📊 Invite Relationships
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
        <Link href="/admin/daily-companion">
          <Button variant="outline" size="sm">
            ✨ Daily Content
          </Button>
        </Link>
      </div>

      {/* Content Alerts */}
      <RhythmContentAlert />

      {/* New Signup Notification */}
      {recentSignups.length > 0 && (
        <div className="p-4 bg-[#c97a2a] rounded-lg border-2 border-[#a84a2a]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-semibold text-white text-lg">🎉 New Signup!</p>
              <p className="text-white text-sm mt-1">
                {recentSignups[0].firstName} {recentSignups[0].lastName} just joined the community
              </p>
              {recentSignups.length > 1 && (
                <p className="text-white/90 text-xs mt-2">
                  +{recentSignups.length - 1} more signup{recentSignups.length > 2 ? 's' : ''} today
                </p>
              )}
            </div>
            <div className="flex-shrink-0 text-white text-2xl font-bold bg-[#a84a2a] w-12 h-12 rounded-full flex items-center justify-center">
              {recentSignups.length}
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader title="Total Members" icon={<IconProfileNav size={20} />} />
          <p className="text-3xl font-bold text-[#d4a348]">247</p>
          <p className="text-sm text-[#a0704a] mt-2">+12 this week</p>
        </Card>

        <Card>
          <CardHeader title="Active This Week" icon={<IconAlert size={20} />} />
          <p className="text-3xl font-bold text-[#d4a348]">156</p>
          <p className="text-sm text-[#a0704a] mt-2">63% engagement</p>
        </Card>

        <Card>
          <CardHeader title="Posts & Responses" icon={<IconChat size={20} />} />
          <p className="text-3xl font-bold text-[#d4a348]">423</p>
          <p className="text-sm text-[#a0704a] mt-2">+45 this week</p>
        </Card>

        <Card>
          <CardHeader title="Connections Completed" icon={<IconConnection size={20} />} />
          <p className="text-3xl font-bold text-[#d4a348]">89</p>
          <p className="text-sm text-[#a0704a] mt-2">High satisfaction</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent Signups" icon={<IconProfileNav size={20} />} />
        <div className="space-y-3">
          {recentSignups.filter((s: any) => s.email && s.email !== "No email").length > 0 ? (
            recentSignups
              .filter((s: any) => s.email && s.email !== "No email")
              .slice(0, 10)
              .map((signup: any, idx: number) => (
                <div key={idx} className="flex justify-between items-start p-3 bg-[#f3ede5] rounded text-sm">
                  <div className="flex-1">
                    <p className="font-medium text-[#1a0f0a]">{signup.firstName} {signup.lastName}</p>
                    <p className="text-xs text-[#a0704a]">{signup.email}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-[#1a0f0a]">{new Date(signup.timestamp).toLocaleDateString()}</p>
                    <p className="text-[#d4a348] font-medium capitalize">{signup.type}</p>
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
            <div className="flex justify-between">
              <span className="text-[#1a0f0a]">The Commons</span>
              <span className="font-medium text-[#1a0f0a]">156 members</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#1a0f0a]">Start Here</span>
              <span className="font-medium text-[#1a0f0a]">142 members</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#1a0f0a]">Spirituality, Sexuality & Integration</span>
              <span className="font-medium text-[#1a0f0a]">128 members</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Member Types" icon={<IconProgress size={20} />} />
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[#1a0f0a]">Individual</span>
              <span className="font-medium text-[#1a0f0a]">154</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#1a0f0a]">Partnered Individual</span>
              <span className="font-medium text-[#1a0f0a]">62</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#1a0f0a]">Couples</span>
              <span className="font-medium text-[#1a0f0a]">31</span>
            </div>
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
            <p className="text-[#1a0f0a]">Avg comments per post: 2.4</p>
            <p className="text-[#1a0f0a]">Connection opt-in rate: 67%</p>
            <p className="text-[#1a0f0a]">Retention (7 days): 78%</p>
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
