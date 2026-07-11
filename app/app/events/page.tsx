"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile } from "@/lib/data/profiles";
import { getUpcomingEvents, toggleEventInterest, getUserEventInterests } from "@/lib/data/events";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { IconUpcoming } from "@/components/Icons";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/Toast";

export default function EventsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [filterFormat, setFilterFormat] = useState<"all" | "virtual" | "in-person" | "hybrid">("all");
  const { toasts, showToast, removeToast } = useToast();

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
    return <LoadingScreen message="Getting ready for events" subtitle="We're personalizing your experience. Just a moment..." />;
  }

  const handleToggleInterest = (eventId: string, eventTitle: string) => {
    const isInterested = toggleEventInterest(profile.id, eventId);
    const newInterests = new Set(interests);
    if (isInterested) {
      newInterests.add(eventId);
      showToast(`Marked "${eventTitle}" as interested!`, "success");
    } else {
      newInterests.delete(eventId);
      showToast(`Removed "${eventTitle}" from interested`, "success");
    }
    setInterests(newInterests);
  };

  const createGoogleCalendarUrl = (event: any) => {
    const startDate = event.date.toISOString().split('T')[0].replace(/-/g, '');
    const endDate = new Date(event.date.getTime() + 3600000).toISOString().split('T')[0].replace(/-/g, '');
    const title = encodeURIComponent(event.title);
    const description = encodeURIComponent(event.description);
    const location = encodeURIComponent(event.location || 'Virtual');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${description}&location=${location}`;
  };

  const createICalFile = (event: any) => {
    const startDate = event.date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(event.date.getTime() + 3600000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//The Connection Room//Event//EN
BEGIN:VEVENT
UID:${event.id}@theconnectionroom.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location || 'Virtual'}
END:VEVENT
END:VCALENDAR`;
    const blob = new Blob([ical], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title}.ics`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredEvents = events.filter(event => {
    if (filterFormat === "all") return true;
    return event.format.toLowerCase().replace(" ", "-") === filterFormat;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl text-[#1a0f0a]">Upcoming Events</h1>
          <p className="text-lg text-[#1a0f0a] mt-2">
            Connection circles, workshops, and gatherings
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-[#d4a348] hover:text-[#c9956d] transition-colors"
          aria-label="Go back"
        >
          ← Back
        </button>
      </div>

      {/* What are Events? */}
      <Card className="bg-gradient-to-br from-[#f3ede5] to-[#fffbf7] border-l-4 border-[#d4a348]">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-[#1a0f0a]">What are Events?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="font-semibold text-[#1a0f0a] mb-2">🎯 Live Experiences</p>
              <p className="text-sm text-[#1a0f0a]">Real-time connection with the community. Virtual circles, in-person workshops, and hybrid offerings.</p>
            </div>
            <div>
              <p className="font-semibold text-[#1a0f0a] mb-2">🤝 Guided Learning</p>
              <p className="text-sm text-[#1a0f0a]">Facilitated by experienced hosts. Structured time to explore intimacy, vulnerability, and authentic connection.</p>
            </div>
            <div>
              <p className="font-semibold text-[#1a0f0a] mb-2">🌱 Growth Opportunity</p>
              <p className="text-sm text-[#1a0f0a]">For all experience levels. Safe space to practice connection in a held, intentional environment.</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter by Format */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[#1a0f0a] uppercase tracking-wide">Filter by format</p>
        <div className="flex flex-wrap gap-2">
          {["all", "virtual", "in-person", "hybrid"].map((format) => (
            <button
              key={format}
              onClick={() => setFilterFormat(format as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterFormat === format
                  ? "bg-[#d4a348] text-white"
                  : "bg-[#f3ede5] text-[#1a0f0a] hover:bg-[#e8ddd2]"
              }`}
            >
              {format === "all" ? "All Events" : format.charAt(0).toUpperCase() + format.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-6">
        {filteredEvents.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-[#a0704a]">No upcoming events at this time.</p>
          </Card>
        ) : (
          filteredEvents.map((event) => (
            <Card key={event.id} className="border-2 border-[#e8ddd2]">
              <div className="flex flex-col md:flex-row gap-4">
                {event.imageUrl && (
                  <div className="md:w-48 md:flex-shrink-0">
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full aspect-video object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 flex-1">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <h2 className="text-2xl text-[#1a0f0a]">{event.title}</h2>
                      <span className="bg-[#d4a348] text-white px-2 py-1 rounded text-xs font-medium">
                        {event.format}
                      </span>
                    </div>

                    <p className="text-[#1a0f0a] mb-4">{event.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-[#a0704a] uppercase tracking-wide text-xs">Date</p>
                        <p className="text-[#1a0f0a] font-medium">
                          {event.date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#a0704a] uppercase tracking-wide text-xs">Time</p>
                        <p className="text-[#1a0f0a] font-medium">{event.time}</p>
                      </div>
                      <div>
                        <p className="text-[#a0704a] uppercase tracking-wide text-xs">Facilitator</p>
                        <p className="text-[#1a0f0a] font-medium">{event.facilitator}</p>
                      </div>
                      <div>
                        <p className="text-[#a0704a] uppercase tracking-wide text-xs">Interested</p>
                        <p className="text-[#1a0f0a] font-medium">{event.attendeeCount}+</p>
                      </div>
                    </div>

                    {event.location && event.format === "in-person" && (
                      <p className="text-[#1a0f0a] text-sm mb-4">📍 {event.location}</p>
                    )}
                  </div>

                  <div className="md:min-w-fit">
                    <Button
                      variant={interests.has(event.id) ? "primary" : "outline"}
                      size="md"
                      onClick={() => handleToggleInterest(event.id, event.title)}
                    >
                      {interests.has(event.id) ? "✓ Interested" : "Mark Interested"}
                    </Button>
                  </div>
                </div>

                {/* Calendar Export Buttons */}
                <div className="border-t border-[#e8ddd2] pt-4">
                  <p className="text-xs font-semibold text-[#a0704a] uppercase tracking-wide mb-3">Add to Calendar</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(createGoogleCalendarUrl(event), "_blank")}
                      className="text-xs"
                    >
                      Google Calendar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createICalFile(event)}
                      className="text-xs"
                    >
                      iCal / Outlook
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Info Card */}
      <Card className="bg-[#f3ede5]">
        <CardHeader title="About Events" icon={<IconUpcoming size={20} />} />
        <ul className="space-y-3 text-[#1a0f0a] text-sm">
          <li className="flex items-start gap-3">
            <span className="text-[#d4a348]">✓</span>
            <span>Mark events to stay notified and connect with other attendees</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4a348]">✓</span>
            <span>Mix of virtual circles, in-person workshops, and hybrid offerings</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4a348]">✓</span>
            <span>All events honor the community agreements and create safe space</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4a348]">✓</span>
            <span>Space for different comfort levels and experience</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4a348]">✓</span>
            <span>Easily add events to your Google Calendar, iCal, or Outlook</span>
          </li>
        </ul>
      </Card>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
