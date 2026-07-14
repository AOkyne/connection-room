"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getAdminEvents, deleteEvent, type Event } from "@/lib/admin/events";
import {
  getEventCapacity,
  setEventCapacity,
  getEventRegistrants,
  updateRegistrantStatus,
  removeRegistrant,
  sendEventNotification,
  getEventStats,
  type EventRegistrant,
} from "@/lib/admin/event-management";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useToast } from "@/lib/hooks/useToast";

export default function AdminEventsPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showRegistrants, setShowRegistrants] = useState(false);
  const [registrants, setRegistrants] = useState<EventRegistrant[]>([]);
  const [capacity, setCapacity] = useState<number | undefined>(undefined);
  const [newCapacity, setNewCapacity] = useState<string>("");
  const [eventStats, setEventStats] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }

      const data = await getAdminEvents();
      setEvents(data);
      setMounted(true);
      setLoading(false);
    };

    loadData();

    const handleFocus = () => {
      loadData();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [router]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event? This cannot be undone.")) {
      return;
    }

    setDeleting(id);
    const success = await deleteEvent(id);

    if (success) {
      setEvents(events.filter((e) => e.id !== id));
      showToast("Event deleted", "success");
    } else {
      showToast("Failed to delete event", "error");
    }
    setDeleting(null);
  };

  const handleViewRegistrants = (eventId: string) => {
    const regs = getEventRegistrants(eventId);
    const stats = getEventStats(eventId);
    const cap = getEventCapacity(eventId);

    setSelectedEventId(eventId);
    setRegistrants(regs);
    setCapacity(cap);
    setEventStats(stats);
    setNewCapacity(cap?.toString() || "");
    setShowRegistrants(true);
  };

  const handleUpdateCapacity = () => {
    if (!selectedEventId || !newCapacity.trim()) return;

    const newCap = parseInt(newCapacity);
    if (isNaN(newCap) || newCap < 0) {
      showToast("Please enter a valid number", "error");
      return;
    }

    setEventCapacity(selectedEventId, newCap);
    setCapacity(newCap);
    showToast(`Capacity updated to ${newCap}`, "success");
  };

  const handleUpdateRegistrantStatus = (
    registrantId: string,
    status: "registered" | "interested" | "attended" | "cancelled"
  ) => {
    if (!selectedEventId) return;

    updateRegistrantStatus(selectedEventId, registrantId, status);
    const updated = registrants.map((r) =>
      r.id === registrantId ? { ...r, status } : r
    );
    setRegistrants(updated);
    showToast(`Status updated to ${status}`, "success");
  };

  const handleRemoveRegistrant = (registrantId: string) => {
    if (!selectedEventId) return;

    removeRegistrant(selectedEventId, registrantId);
    setRegistrants(registrants.filter((r) => r.id !== registrantId));
    showToast("Registrant removed", "success");
  };

  if (!mounted || loading) {
    return (
      <LoadingScreen
        message="Loading events"
        subtitle="Fetching event data..."
      />
    );
  }

  const filteredEvents = events.filter((e) => {
    if (filter === "all") return true;
    return e.status === filter;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <Breadcrumb
        items={[
          { label: "Admin", href: "/app/admin" },
          { label: "Events", isActive: true },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1a0f0a]">Events</h1>
          <p className="text-[#a0704a] mt-1">Manage community events</p>
        </div>
        <Link href="/app/admin/events/new">
          <Button variant="primary" size="md">
            + Create Event
          </Button>
        </Link>
      </div>

      <div className="flex gap-2">
        {(["all", "published", "draft"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? "bg-[#d4a348] text-white"
                : "bg-[#f3ede5] text-[#1a0f0a] hover:bg-[#e8ddd2]"
            }`}
          >
            {f === "all"
              ? `All (${events.length})`
              : `${f === "published" ? "Published" : "Draft"} (${events.filter((e) => e.status === f).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-[#a0704a] mb-4">No events found</p>
            <Link href="/app/admin/events/new">
              <Button variant="secondary">Create the first event</Button>
            </Link>
          </Card>
        ) : (
          filteredEvents.map((event) => (
            <Card key={event.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-[#1a0f0a]">
                      {event.title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        event.status === "published"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {event.status}
                    </span>
                    {event.featured && (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
                        ⭐ Featured
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-[#a0704a] mb-2">
                    {event.startAt
                      ? new Date(event.startAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "No date"}
                  </p>

                  {event.shortDescription && (
                    <p className="text-sm text-[#1a0f0a] line-clamp-2">
                      {event.shortDescription}
                    </p>
                  )}

                  <div className="flex gap-4 mt-3 text-xs text-[#a0704a]">
                    {event.registrationCount !== undefined && (
                      <span>🔗 {event.registrationCount} registered</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewRegistrants(event.id)}
                  >
                    👥 Registrants
                  </Button>
                  <Link href={`/app/admin/events/${event.id}/edit`}>
                    <Button variant="outline" size="sm">
                      ✎ Edit
                    </Button>
                  </Link>
                  <button
                    onClick={() => handleDelete(event.id)}
                    disabled={deleting === event.id}
                    className="px-3 py-2 text-xs font-medium rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {deleting === event.id ? "Deleting..." : "🗑 Delete"}
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Registrants Modal */}
      {showRegistrants && selectedEventId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#1a0f0a]">
                  Event Registrants
                </h2>
                <button
                  onClick={() => setShowRegistrants(false)}
                  className="text-[#a0704a] hover:text-[#1a0f0a]"
                >
                  ✕
                </button>
              </div>

              {/* Stats Overview */}
              {eventStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-[#f3ede5] rounded">
                  <div>
                    <p className="text-xs text-[#a0704a]">Registered</p>
                    <p className="text-lg font-bold text-[#1a0f0a]">
                      {eventStats.registered}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#a0704a]">Interested</p>
                    <p className="text-lg font-bold text-[#1a0f0a]">
                      {eventStats.interested}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#a0704a]">Attended</p>
                    <p className="text-lg font-bold text-[#1a0f0a]">
                      {eventStats.attended}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#a0704a]">Cancelled</p>
                    <p className="text-lg font-bold text-[#1a0f0a]">
                      {eventStats.cancelled}
                    </p>
                  </div>
                </div>
              )}

              {/* Capacity Management */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1a0f0a] block">
                  Event Capacity
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    placeholder="Set capacity..."
                    className="flex-1 px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpdateCapacity}
                  >
                    Update
                  </Button>
                </div>
                {capacity !== undefined && (
                  <p className="text-xs text-[#a0704a]">
                    Current capacity: {capacity || "Not set"}
                  </p>
                )}
              </div>

              {/* Registrants List */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1a0f0a] block">
                  Registrants ({registrants.length})
                </label>
                {registrants.length === 0 ? (
                  <p className="text-sm text-[#a0704a] p-3 bg-[#f3ede5] rounded">
                    No registrants yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {registrants.map((reg) => (
                      <div
                        key={reg.id}
                        className="flex items-center gap-2 p-2 bg-[#f3ede5] rounded text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1a0f0a] truncate">
                            {reg.userName}
                          </p>
                          <p className="text-xs text-[#a0704a]">
                            {new Date(reg.registeredAt).toLocaleDateString()}
                          </p>
                        </div>
                        <select
                          value={reg.status}
                          onChange={(e) =>
                            handleUpdateRegistrantStatus(
                              reg.id,
                              e.target.value as
                                | "registered"
                                | "interested"
                                | "attended"
                                | "cancelled"
                            )
                          }
                          className="px-2 py-1 border border-[#e8ddd2] rounded text-xs text-[#1a0f0a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                        >
                          <option value="interested">Interested</option>
                          <option value="registered">Registered</option>
                          <option value="attended">Attended</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                          onClick={() => handleRemoveRegistrant(reg.id)}
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#e8ddd2]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRegistrants(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
