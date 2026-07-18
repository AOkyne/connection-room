"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile } from "@/lib/data/profiles";
import { getUpcomingEvents, getPastEvents } from "@/lib/data/events";
import { getUserRegistrations, markAsInterested, updateRegistrationStatus } from "@/lib/admin/registrations";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { IconUpcoming } from "@/components/Icons";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/Toast";
import { EventRegistrationModal } from "@/components/EventRegistrationModal";

export default function EventsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [registrations, setRegistrations] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [filterFormat, setFilterFormat] = useState<"all" | "virtual" | "in-person" | "hybrid">("all");
  const [registrationModal, setRegistrationModal] = useState<{
    isOpen: boolean;
    eventId: string;
    eventTitle: string;
    eventDate: string;
  }>({ isOpen: false, eventId: "", eventTitle: "", eventDate: "" });
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      const p = await getProfile();
      setProfile(p);

      const upcoming = await getUpcomingEvents();
      const past = await getPastEvents();
      setUpcomingEvents(upcoming);
      setPastEvents(past);

      if (p) {
        const regs = await getUserRegistrations(p.id);
        setInterests(new Set(regs.filter((r) => r.status === "interested").map((r) => r.eventId)));
        setRegistrations(new Set(regs.filter((r) => r.status === "registered").map((r) => r.eventId)));
      }

      setMounted(true);
    };

    loadData();
  }, []);

  if (!mounted || !profile) {
    return <LoadingScreen message="Getting ready for events" subtitle="We're personalizing your experience. Just a moment..." />;
  }

  const handleToggleInterest = async (eventId: string, eventTitle: string, eventDate: Date) => {
    const dateString = eventDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    const isCurrentlyInterested = interests.has(eventId);

    if (isCurrentlyInterested) {
      // Remove interest by marking as cancelled
      await updateRegistrationStatus(eventId, profile.id, "cancelled", eventTitle, profile.fullName || profile.email, profile.email, dateString);
      const newInterests = new Set(interests);
      newInterests.delete(eventId);
      setInterests(newInterests);
      showToast(`Removed "${eventTitle}" from interested`, "success");
    } else {
      // Add interest - create registration with "interested" status
      await markAsInterested(eventId, profile.id, profile.fullName || profile.email, profile.email, eventTitle, dateString);
      const newInterests = new Set(interests);
      newInterests.add(eventId);
      setInterests(newInterests);
      showToast(`Marked "${eventTitle}" as interested!`, "success");
    }
  };

  const handleOpenRegistrationModal = (eventId: string, eventTitle: string, eventDate: Date) => {
    const dateString = eventDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    setRegistrationModal({ isOpen: true, eventId, eventTitle, eventDate: dateString });
  };

  const handleRegistrationChange = (isRegistered: boolean) => {
    const newRegistrations = new Set(registrations);
    if (isRegistered) {
      newRegistrations.add(registrationModal.eventId);
    } else {
      newRegistrations.delete(registrationModal.eventId);
    }
    setRegistrations(newRegistrations);
  };

  const formatPrice = (priceCents?: number, currency?: string) => {
    if (!priceCents) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: priceCents % 100 === 0 ? 0 : 2,
    }).format(priceCents / 100);
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

  const currentEvents = tab === "upcoming" ? upcomingEvents : pastEvents;

  const filteredEvents = currentEvents.filter(event => {
    if (filterFormat === "all") return true;
    return event.format.toLowerCase().replace(" ", "-") === filterFormat;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl text-[#1a0f0a]">
            {tab === "upcoming" ? "Upcoming Events" : "Past Events"}
          </h1>
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

      {/* Event Type Tabs */}
      <div className="flex gap-2 border-b border-[#e8ddd2]">
        <button
          onClick={() => setTab("upcoming")}
          className={`px-4 py-3 font-medium transition-all border-b-2 ${
            tab === "upcoming"
              ? "border-[#d4a348] text-[#d4a348]"
              : "border-transparent text-[#a0704a] hover:text-[#1a0f0a]"
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setTab("past")}
          className={`px-4 py-3 font-medium transition-all border-b-2 ${
            tab === "past"
              ? "border-[#d4a348] text-[#d4a348]"
              : "border-transparent text-[#a0704a] hover:text-[#1a0f0a]"
          }`}
        >
          Past
        </button>
      </div>

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
                  <div className="md:w-72 md:flex-shrink-0">
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full aspect-[4/3] object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
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

                    <div
                      className="text-[#1a0f0a] mb-4 prose prose-sm prose-headings:text-[#1a0f0a] prose-p:text-[#1a0f0a] prose-li:text-[#1a0f0a] prose-strong:font-semibold prose-em:italic"
                      dangerouslySetInnerHTML={{ __html: event.description }}
                    />

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-4">
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
                        <p className="text-[#a0704a] uppercase tracking-wide text-xs">Price</p>
                        <p className="text-[#1a0f0a] font-medium">{formatPrice(event.priceCents, event.currency)}</p>
                      </div>
                      <div>
                        <p className="text-[#a0704a] uppercase tracking-wide text-xs">Interested</p>
                        <p className="text-[#1a0f0a] font-medium">{event.attendeeCount}+</p>
                      </div>
                    </div>

                    {event.location && event.format === "in-person" && (
                      <p className="text-[#1a0f0a] text-sm mb-4">📍 {event.location}</p>
                    )}

                    {(event.format === "virtual" || event.format === "hybrid") && (
                      registrations.has(event.id) && event.onlineUrl ? (
                        <a
                          href={event.onlineUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-[#d4a348] hover:text-[#c9956d] text-sm font-medium mb-4"
                        >
                          🔗 Join Online
                        </a>
                      ) : (
                        <p className="text-[#a0704a] text-sm mb-4">
                          💻 Online — the join link appears here once you register
                        </p>
                      )
                    )}
                  </div>

                  {/* Action Buttons Column */}
                  <div className="flex flex-col gap-6 md:min-w-fit">
                    <Button
                      variant={registrations.has(event.id) ? "primary" : "primary"}
                      size="md"
                      onClick={() => handleOpenRegistrationModal(event.id, event.title, event.date)}
                    >
                      {registrations.has(event.id) ? "✓ Registered" : "Register"}
                    </Button>

                    <Button
                      variant={interests.has(event.id) ? "primary" : "outline"}
                      size="md"
                      onClick={() => {
                        handleToggleInterest(event.id, event.title, event.date);
                      }}
                    >
                      {interests.has(event.id) ? "♥ Interested" : "Mark Interested"}
                    </Button>

                    <div className="flex flex-col gap-2 pt-4 border-t border-[#e8ddd2]">
                      <p className="text-xs font-semibold text-[#a0704a] uppercase tracking-wide">Add to Calendar</p>
                      <div className="flex flex-col gap-2">
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

      {/* Event Registration Modal */}
      <EventRegistrationModal
        eventId={registrationModal.eventId}
        eventTitle={registrationModal.eventTitle}
        eventDate={registrationModal.eventDate}
        isOpen={registrationModal.isOpen}
        isRegistered={registrations.has(registrationModal.eventId)}
        userId={profile.id}
        onClose={() => setRegistrationModal({ ...registrationModal, isOpen: false })}
        onRegistrationChange={handleRegistrationChange}
      />
    </div>
  );
}
