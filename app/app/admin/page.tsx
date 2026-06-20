"use client";

import { useEffect, useState } from "react";
import { getAllBadges } from "@/lib/data/badges";
import { getUpcomingEvents } from "@/lib/data/events";
import { getAllOffers } from "@/lib/data/offers";
import { Card, CardHeader } from "@/components/Card";
import { IconConnection, IconDemo, IconSpaces, IconBadges, IconProgress, IconUpcoming, IconAlert, IconForYou, IconChat, IconProfileNav } from "@/components/Icons";
import { getBadgeIcon } from "@/lib/badge-icons";
import { getOfferIcon } from "@/lib/offer-icons";
import { RhythmContentAlert } from "@/components/admin/RhythmContentAlert";
import { RhythmContentEditor } from "@/components/admin/RhythmContentEditor";

export default function AdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [concerns, setConcerns] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      // In development, allow access without auth check
      // Production should verify session.type === "admin"

      setBadges(getAllBadges());
      setEvents(getUpcomingEvents());
      setOffers(getAllOffers());

      // Load reported concerns from localStorage
      if (typeof window !== "undefined") {
        const storedConcerns = localStorage.getItem("connection-room:pairing-reports");
        if (storedConcerns) {
          setConcerns(JSON.parse(storedConcerns));
        }
      }

      setMounted(true);
    };

    loadData();
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl text-[#2a2318]">Admin Dashboard</h1>
        <p className="text-lg text-[#6b5f52] mt-2">
          Community overview and management
        </p>
      </div>

      {/* Content Alerts */}
      <RhythmContentAlert />

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader title="Total Members" icon={<IconProfileNav size={20} />} />
          <p className="text-3xl font-bold text-[#d4a574]">247</p>
          <p className="text-sm text-[#a0968a] mt-2">+12 this week</p>
        </Card>

        <Card>
          <CardHeader title="Active This Week" icon={<IconAlert size={20} />} />
          <p className="text-3xl font-bold text-[#d4a574]">156</p>
          <p className="text-sm text-[#a0968a] mt-2">63% engagement</p>
        </Card>

        <Card>
          <CardHeader title="Posts & Responses" icon={<IconChat size={20} />} />
          <p className="text-3xl font-bold text-[#d4a574]">423</p>
          <p className="text-sm text-[#a0968a] mt-2">+45 this week</p>
        </Card>

        <Card>
          <CardHeader title="Pairings Completed" icon={<IconConnection size={20} />} />
          <p className="text-3xl font-bold text-[#d4a574]">89</p>
          <p className="text-sm text-[#a0968a] mt-2">High satisfaction</p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Most Active Spaces" icon={<IconSpaces size={20} />} />
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[#6b5f52]">The Commons</span>
              <span className="font-medium text-[#2a2318]">156 members</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b5f52]">Start Here</span>
              <span className="font-medium text-[#2a2318]">142 members</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b5f52]">Spirituality, Sexuality & Integration</span>
              <span className="font-medium text-[#2a2318]">128 members</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Member Types" icon={<IconProgress size={20} />} />
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[#6b5f52]">Individual</span>
              <span className="font-medium text-[#2a2318]">154</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b5f52]">Partnered Individual</span>
              <span className="font-medium text-[#2a2318]">62</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b5f52]">Couples</span>
              <span className="font-medium text-[#2a2318]">31</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Reported Concerns" icon={<IconAlert size={20} />} />
          <div className="space-y-3">
            {concerns.length > 0 ? (
              <>
                <p className="text-[#6b5f52] text-sm font-medium">{concerns.length} pending review</p>
                {concerns.slice(0, 2).map((concern: any) => (
                  <div key={concern.id} className="text-xs p-2 bg-[#f3ede5] rounded">
                    <p className="text-[#6b5f52]">{concern.concern.substring(0, 50)}...</p>
                    <p className="text-[#a0968a]">Status: {concern.status}</p>
                  </div>
                ))}
              </>
            ) : (
              <>
                <p className="text-[#6b5f52] text-sm">No active concerns</p>
                <div className="text-[#8fa878] text-sm font-medium">✓ Community in good standing</div>
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Quick Stats" icon={<IconProgress size={20} />} />
          <div className="space-y-2 text-sm">
            <p className="text-[#6b5f52]">Avg comments per post: 2.4</p>
            <p className="text-[#6b5f52]">Pairing opt-in rate: 67%</p>
            <p className="text-[#6b5f52]">Retention (7 days): 78%</p>
          </div>
        </Card>
      </div>

      {/* Badges */}
      <Card>
        <CardHeader title="Available Badges" icon={<IconBadges size={20} />} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {badges.map((badge) => {
            const BadgeIcon = getBadgeIcon(badge.id);
            return (
              <div key={badge.id} className="text-center p-3 bg-[#f3ede5] rounded">
                <BadgeIcon size={28} className="mx-auto mb-2 text-[#d4a574]" />
                <p className="font-medium text-[#2a2318] text-sm">{badge.name}</p>
                <p className="text-xs text-[#a0968a] mt-1">{badge.description}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader title="Upcoming Events" icon={<IconUpcoming size={20} />} />
        <div className="space-y-3">
          {events.length > 0 ? (
            events.slice(0, 3).map((event) => (
              <div key={event.id} className="border-l-4 border-[#d4a574] pl-3">
                <p className="font-medium text-[#2a2318]">{event.title}</p>
                <p className="text-sm text-[#6b5f52]">
                  {event.date.toLocaleDateString()} at {event.time}
                </p>
                <p className="text-xs text-[#a0968a]">
                  {event.attendeeCount} interested • {event.format}
                </p>
              </div>
            ))
          ) : (
            <p className="text-[#a0968a] text-sm">No upcoming events</p>
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
                <OfferIcon size={24} className="mb-1 text-[#d4a574]" />
                <p className="font-medium text-[#2a2318] text-sm">{offer.title}</p>
                <p className="text-xs text-[#6b5f52] mt-1">{offer.description}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Content Editor */}
      <div className="border-t border-[#e8ddd2] pt-8">
        <RhythmContentEditor />
      </div>

      <Card className="bg-[#f3ede5]">
        <CardHeader title="Demo Mode Features" icon={<IconDemo size={20} />} />
        <p className="text-[#6b5f52] mb-4">
          This admin dashboard shows demo data. In Phase 2, you&apos;ll be able to:
        </p>
        <ul className="space-y-2 text-[#6b5f52] text-sm">
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
