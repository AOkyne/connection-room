"use client";

import { useState, useEffect } from "react";
import { getProfile } from "@/lib/data/profiles";
import { getUpcomingEvents, toggleEventInterest, getUserEventInterests } from "@/lib/data/events";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { IconUpcoming } from "@/components/Icons";

export default function EventsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const p = await getProfile();
      setProfile(p);

      const e = getUpcomingEvents();
      setEvents(e);

      if (p) {
        const i = getUserEventInterests(p.id);
        setInterests(i);
      }

      setMounted(true);
    };

    loadData();
  }, []);

  if (!mounted || !profile) {
    return <div>Loading...</div>;
  }

  const handleToggleInterest = (eventId: string) => {
    const isInterested = toggleEventInterest(profile.id, eventId);
    const newInterests = new Set(interests);
    if (isInterested) {
      newInterests.add(eventId);
    } else {
      newInterests.delete(eventId);
    }
    setInterests(newInterests);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl text-[#2a2318]">Upcoming Events</h1>
        <p className="text-lg text-[#6b5f52] mt-2">
          Connection circles, workshops, and gatherings
        </p>
      </div>

      {/* Events List */}
      <div className="space-y-6">
        {events.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-[#a0968a]">No upcoming events at this time.</p>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="border-2 border-[#e8ddd2]">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <h2 className="text-2xl text-[#2a2318]">{event.title}</h2>
                    <span className="bg-[#d4a574] text-white px-2 py-1 rounded text-xs font-medium">
                      {event.format}
                    </span>
                  </div>

                  <p className="text-[#6b5f52] mb-4">{event.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-[#a0968a] uppercase tracking-wide text-xs">Date</p>
                      <p className="text-[#2a2318] font-medium">
                        {event.date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#a0968a] uppercase tracking-wide text-xs">Time</p>
                      <p className="text-[#2a2318] font-medium">{event.time}</p>
                    </div>
                    <div>
                      <p className="text-[#a0968a] uppercase tracking-wide text-xs">Facilitator</p>
                      <p className="text-[#2a2318] font-medium">{event.facilitator}</p>
                    </div>
                    <div>
                      <p className="text-[#a0968a] uppercase tracking-wide text-xs">Interested</p>
                      <p className="text-[#2a2318] font-medium">{event.attendeeCount}+</p>
                    </div>
                  </div>

                  {event.location && event.format === "in-person" && (
                    <p className="text-[#6b5f52] text-sm mb-4">📍 {event.location}</p>
                  )}
                </div>

                <div className="md:min-w-fit">
                  <Button
                    variant={interests.has(event.id) ? "primary" : "outline"}
                    size="md"
                    onClick={() => handleToggleInterest(event.id)}
                  >
                    {interests.has(event.id) ? "✓ Interested" : "Mark Interested"}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Info Card */}
      <Card className="bg-[#f3ede5]">
        <CardHeader title="About Events" icon={<IconUpcoming size={20} />} />
        <ul className="space-y-3 text-[#6b5f52] text-sm">
          <li className="flex items-start gap-3">
            <span className="text-[#d4a574]">✓</span>
            <span>Mark events to stay notified and connect with other attendees</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4a574]">✓</span>
            <span>Mix of virtual circles, in-person workshops, and hybrid offerings</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4a574]">✓</span>
            <span>All events honor the community agreements and create safe space</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4a574]">✓</span>
            <span>Space for different comfort levels and experience</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
