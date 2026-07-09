"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getAdminEvents, deleteEvent, type Event } from "@/lib/admin/events";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
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

                <div className="flex gap-2">
                  <Link href={`/app/admin/events/${event.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <button
                    onClick={() => handleDelete(event.id)}
                    disabled={deleting === event.id}
                    className="px-3 py-2 text-xs font-medium rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {deleting === event.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
